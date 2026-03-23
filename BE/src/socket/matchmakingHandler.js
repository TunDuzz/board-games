const { MatchmakingQueue, Room, RoomPlayer, GameType, User } = require("../models");
const bcrypt = require("bcryptjs");
const sequelize = require("../config/database");
const { Op } = require("sequelize");

const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

module.exports = (io, socket, onlineUsers) => {

    // KẾT NỐI TÌM TRẬN
    socket.on("join_matchmaking", async (data) => {
        try {
            const { gameTypeName } = data || {};
            const userId = socket.user.id;
            const elo = socket.user.elo || 1000;

            if (!gameTypeName) {
                return socket.emit("matchmaking_error", { message: "Vui lòng chọn loại game (chess, xiangqi, caro)" });
            }

            const gameType = await GameType.findOne({ where: { name: gameTypeName } });
            if (!gameType) return socket.emit("matchmaking_error", { message: "Loại game không hợp lệ" });

            // Kiểm tra user đã đang trong queue hay room chưa
            const isQueued = await MatchmakingQueue.findOne({ where: { user_id: userId } });
            if (isQueued) return socket.emit("matchmaking_error", { message: "Đang trong hàng chờ tìm trận" });

            const isInRoom = await RoomPlayer.findOne({
                where: { user_id: userId },
                include: [{ model: Room, where: { status: { [Op.ne]: "ended" } } }]
            });
            if (isInRoom) return socket.emit("matchmaking_error", { message: "Bạn đang trong phòng, không thể tìm trận mới" });

            // Transaction để chống Race Condition khi 2 user join cùng lúc
            const t = await sequelize.transaction();

            try {
                // Tìm 1 đối thủ cùng loại game (ưu tiên người chờ lâu nhất)
                const opponent = await MatchmakingQueue.findOne({
                    where: {
                        game_type_id: gameType.game_type_id,
                        user_id: { [Op.ne]: userId }
                    },
                    order: [['joined_at', 'ASC']],
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });

                if (opponent) {
                    // ĐÃ TÌM THẤY ĐỐI THỦ -> Xóa khỏi queue
                    await opponent.destroy({ transaction: t });

                    // Sinh mã phòng unique
                    let room_code;
                    let isUnique = false;
                    while (!isUnique) {
                        room_code = generateRoomCode();
                        const existing = await Room.findOne({ where: { room_code }, transaction: t });
                        if (!existing) isUnique = true;
                    }

                    // Tạo Room mới cho cả 2
                    const newRoom = await Room.create({
                        game_type_id: gameType.game_type_id,
                        host_id: opponent.user_id, // Người chờ lâu làm host / đi trước
                        is_private: false,
                        room_code,
                        status: "playing" // Phòng ngay lập tức bắt đầu
                    }, { transaction: t });

                    // Thêm cả 2 vào RoomPlayer
                    await RoomPlayer.bulkCreate([
                        { room_id: newRoom.room_id, user_id: opponent.user_id, role: "player1", is_ready: true },
                        { room_id: newRoom.room_id, user_id: userId, role: "player2", is_ready: true }
                    ], { transaction: t });

                    await t.commit();

                    const roomInfo = {
                        room_id: newRoom.room_id,
                        room_code: newRoom.room_code,
                        game: gameTypeName
                    };

                    // Gửi event match_found real-time cho đối thủ đang chờ
                    const opponentSocketId = onlineUsers.get(opponent.user_id);
                    if (opponentSocketId) {
                        io.to(opponentSocketId).emit("match_found", { ...roomInfo, role: "player1" });
                    }
                    // Và cho chính mình
                    socket.emit("match_found", { ...roomInfo, role: "player2" });

                } else {
                    // CHƯA CÓ ĐỐI THỦ -> Vào hàng chờ
                    await MatchmakingQueue.create({
                        user_id: userId,
                        game_type_id: gameType.game_type_id,
                        elo_snapshot: elo
                    }, { transaction: t });

                    await t.commit();

                    socket.emit("matchmaking_started", { message: "Đang tìm đối thủ. Vui lòng chờ..." });
                }
            } catch (innerError) {
                await t.rollback();
                throw innerError;
            }

        } catch (error) {
            console.error("[Matchmaking] Join error:", error);
            socket.emit("matchmaking_error", { message: "Lỗi server khi tìm trận", error: error.message });
        }
    });

    // HỦY TÌM TRẬN
    socket.on("cancel_matchmaking", async () => {
        try {
            const count = await MatchmakingQueue.destroy({ where: { user_id: socket.user.id } });
            if (count > 0) {
                socket.emit("matchmaking_cancelled", { message: "Đã hủy tìm trận" });
            } else {
                socket.emit("matchmaking_error", { message: "Bạn không có trong hàng chờ tìm trận" });
            }
        } catch (error) {
            console.error("[Matchmaking] Cancel error:", error);
            socket.emit("matchmaking_error", { message: "Lỗi hủy tìm trận" });
        }
    });

    // ==========================================
    // TẠO PHÒNG QUA SOCKET
    // ==========================================
    socket.on("create_room", async (data) => {
        try {
            const userId = socket.user.id;
            const { gameTypeName, password, is_private } = data || {};

            if (!gameTypeName) return socket.emit("create_room_error", { message: "Thiếu gameTypeName" });

            const gameType = await GameType.findOne({ where: { name: gameTypeName } });
            if (!gameType) return socket.emit("create_room_error", { message: "Loại game không hợp lệ" });

            let password_hash = null;
            let isPrivateRoom = is_private || false;
            if (password) {
                const salt = await bcrypt.genSalt(10);
                password_hash = await bcrypt.hash(password, salt);
                isPrivateRoom = true;
            }

            let room_code;
            let isUnique = false;
            while (!isUnique) {
                room_code = generateRoomCode();
                const existingRoom = await Room.findOne({ where: { room_code } });
                if (!existingRoom) isUnique = true;
            }

            const newRoom = await Room.create({
                game_type_id: gameType.game_type_id,
                host_id: userId,
                is_private: isPrivateRoom,
                room_code,
                password_hash,
                status: "waiting"
            });

            await RoomPlayer.create({
                room_id: newRoom.room_id,
                user_id: userId,
                role: "player1",
                is_ready: true
            });

            socket.join(`game_room_${newRoom.room_id}`);

            socket.emit("room_created", {
                message: "Tạo phòng thành công!",
                room: {
                    room_id: newRoom.room_id,
                    room_code: newRoom.room_code,
                    game_name: gameTypeName,
                    is_private: newRoom.is_private,
                    status: newRoom.status
                }
            });

        } catch (error) {
            console.error("[Socket] Create Room error:", error);
            socket.emit("create_room_error", { message: "Lỗi server khi tạo phòng" });
        }
    });

    // ==========================================
    // THAM GIA PHÒNG QUA SOCKET
    // ==========================================
    socket.on("join_room", async (data) => {
        try {
            const userId = socket.user.id;
            const { roomIdOrCode, password } = data || {};

            if (!roomIdOrCode) return socket.emit("join_room_error", { message: "Thiếu thông tin phòng" });

            const room = await Room.findOne({
                where: {
                    [Op.or]: [
                        { room_id: isNaN(roomIdOrCode) ? -1 : parseInt(roomIdOrCode) },
                        { room_code: roomIdOrCode.toString().toUpperCase() }
                    ]
                },
                include: [{ model: RoomPlayer }]
            });

            if (!room) return socket.emit("join_room_error", { message: "Không tìm thấy phòng" });

            const isAlreadyInRoom = room.RoomPlayers.some(p => p.user_id === userId);
            if (isAlreadyInRoom) {
                socket.join(`game_room_${room.room_id}`);
                return socket.emit("room_joined", { message: "Đã ở trong phòng", room_id: room.room_id });
            }

            if (room.status !== "waiting") return socket.emit("join_room_error", { message: "Phòng đang chơi hoặc đã kết thúc" });

            if (room.is_private && room.password_hash) {
                if (!password) return socket.emit("join_room_error", { message: "Phòng yêu cầu mật khẩu" });
                const isMatch = await bcrypt.compare(password, room.password_hash);
                if (!isMatch) return socket.emit("join_room_error", { message: "Mật khẩu không đúng" });
            }

            const currentPlayers = room.RoomPlayers.filter(p => p.role.startsWith("player"));
            if (currentPlayers.length >= 2) return socket.emit("join_room_error", { message: "Phòng đã đủ người chơi" });

            const newRole = currentPlayers.some(p => p.role === "player1") ? "player2" : "player1";

            await RoomPlayer.create({
                room_id: room.room_id,
                user_id: userId,
                role: newRole,
                is_ready: false
            });

            const roomKey = `game_room_${room.room_id}`;
            socket.join(roomKey);

            socket.to(roomKey).emit("player_joined", {
                userId,
                username: socket.user.username,
                role: newRole
            });

            socket.emit("room_joined", {
                message: "Tham gia phòng thành công!",
                room: {
                    room_id: room.room_id,
                    room_code: room.room_code,
                    role: newRole
                }
            });

        } catch (error) {
            console.error("[Socket] Join Room error:", error);
            socket.emit("join_room_error", { message: "Lỗi Server khi vào phòng" });
        }
    });

    // ==========================================
    // TÌM PHÒNG NHANH QUA SOCKET
    // ==========================================
    socket.on("quick_join", async (data) => {
        try {
            const userId = socket.user.id;
            const { gameTypeName } = data || {};

            if (!gameTypeName) return socket.emit("quick_join_error", { message: "Vui lòng chọn loại game" });

            const gameType = await GameType.findOne({ where: { name: gameTypeName } });
            if (!gameType) return socket.emit("quick_join_error", { message: "Loại game không hợp lệ" });

            const availableRooms = await Room.findAll({
                where: { game_type_id: gameType.game_type_id, is_private: false, status: "waiting" },
                include: [{ model: RoomPlayer }]
            });

            const validRooms = availableRooms.filter(room => {
                const players = room.RoomPlayers.filter(p => p.role.startsWith("player"));
                const alreadyIn = room.RoomPlayers.some(p => p.user_id === userId);
                return players.length < 2 && !alreadyIn;
            });

            if (validRooms.length === 0) return socket.emit("quick_join_error", { message: "Không tìm thấy phòng trống" });

            const targetRoom = validRooms[0];
            const currentPlayers = targetRoom.RoomPlayers.filter(p => p.role.startsWith("player"));
            const newRole = currentPlayers.some(p => p.role === "player1") ? "player2" : "player1";

            await RoomPlayer.create({
                room_id: targetRoom.room_id,
                user_id: userId,
                role: newRole,
                is_ready: false
            });

            const roomKey = `game_room_${targetRoom.room_id}`;
            socket.join(roomKey);

            socket.to(roomKey).emit("player_joined", {
                userId,
                username: socket.user.username,
                role: newRole
            });

            socket.emit("room_joined", {
                message: "Vào phòng nhanh thành công!",
                room: {
                    room_id: targetRoom.room_id,
                    room_code: targetRoom.room_code,
                    role: newRole
                }
            });

        } catch (error) {
            console.error("[Socket] Quick Join error:", error);
            socket.emit("quick_join_error", { message: "Lỗi tìm phòng nhanh" });
        }
    });

    // ==========================================
    // GỬI LỜI MỜI VÀO PHÒNG QUA SOCKET
    // ==========================================
    socket.on("send_room_invite", async (data) => {
        try {
            const { toUserId, roomId } = data || {};
            if (!toUserId || !roomId) return socket.emit("invite_error", { message: "Thiếu thông tin người nhận hoặc phòng" });

            const recipientSocketId = onlineUsers.get(toUserId);
            if (!recipientSocketId) return socket.emit("invite_error", { message: "Người dùng không trực tuyến" });

            const room = await Room.findByPk(roomId, { include: [{ model: GameType }] });
            if (!room) return socket.emit("invite_error", { message: "Không tìm thấy phòng tương ứng" });

            io.to(recipientSocketId).emit("room_invite_received", {
                fromUser: { id: socket.user.id, username: socket.user.username },
                room: {
                    room_id: room.room_id,
                    room_code: room.room_code,
                    gameTypeName: room.GameType?.name
                }
            });

            socket.emit("invite_sent_success", { message: "Gửi lời mời thành công!" });

        } catch (error) {
            console.error("[Socket] Send Invite error:", error);
            socket.emit("invite_error", { message: "Lỗi khi gửi lời mời" });
        }
    });

};
