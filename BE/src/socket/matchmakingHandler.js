const { MatchmakingQueue, Room, RoomPlayer, GameType } = require("../models");
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
};
