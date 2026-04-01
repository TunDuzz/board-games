const { Room, RoomPlayer, GameType, User } = require("../models");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");

// Hàm sinh mã phòng ngẫu nhiên (6 ký tự)
const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// ==========================================
// TẠO PHÒNG MỚI
// ==========================================
exports.createRoom = async (req, res) => {
    try {
        const userId = req.user.id;
        const { gameTypeName, password, is_private } = req.body;

        if (!gameTypeName) {
            return res.status(400).json({ message: "Vui lòng chọn loại game (chess, xiangqi, caro)" });
        }

        // 1. Tìm GameType ID
        const gameType = await GameType.findOne({ where: { name: gameTypeName } });
        if (!gameType) {
            return res.status(404).json({ message: "Loại game không hợp lệ" });
        }

        // 2. Xử lý password nếu phòng private
        let password_hash = null;
        let isPrivateRoom = is_private || false;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            password_hash = await bcrypt.hash(password, salt);
            isPrivateRoom = true; // Bắt buộc là private nếu có pass
        }

        // 3. Sinh mã phòng unique
        let room_code;
        let isUnique = false;
        while (!isUnique) {
            room_code = generateRoomCode();
            const existingRoom = await Room.findOne({ where: { room_code } });
            if (!existingRoom) isUnique = true;
        }

        // 4. Tạo Room
        const newRoom = await Room.create({
            game_type_id: gameType.game_type_id,
            host_id: userId,
            is_private: isPrivateRoom,
            room_code,
            password_hash,
            status: "waiting"
        });

        // 5. Thêm người tạo vào RoomPlayer (vai trò player1)
        await RoomPlayer.create({
            room_id: newRoom.room_id,
            user_id: userId,
            role: "player1",
            is_ready: true // Host mặc định ready
        });

        res.status(201).json({
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
        res.status(500).json({ message: "Lỗi server khi tạo phòng!", error: error.message });
    }
};

// ==========================================
// LẤY DANH SÁCH PHÒNG THEO GAME
// ==========================================
exports.getRoomsByGameType = async (req, res) => {
    try {
        const { gameTypeName } = req.params;

        const gameType = await GameType.findOne({ where: { name: gameTypeName } });
        if (!gameType) {
            return res.status(404).json({ message: "Loại game không hợp lệ" });
        }

        const rooms = await Room.findAll({
            where: {
                game_type_id: gameType.game_type_id,
                status: "waiting",
                is_private: false // Chỉ hiển thị phòng public ra sảnh
            },
            include: [
                {
                    model: User,
                    as: "host",
                    attributes: ["user_id", "username", "avatar_url", "elo"]
                },
                {
                    model: RoomPlayer,
                    attributes: ["user_id", "role"]
                }
            ],
            order: [["created_at", "DESC"]],
            limit: 50
        });

        // Format lại dữ liệu trả về cho client
        const formattedRooms = rooms.map(room => ({
            room_id: room.room_id,
            room_code: room.room_code,
            host_id: room.host_id,
            host_name: room.host.username,
            host_elo: room.host.elo,
            player_count: room.RoomPlayers.length,
            created_at: room.created_at
        }));

        res.json({
            game: gameTypeName,
            total: formattedRooms.length,
            rooms: formattedRooms
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi GET rooms!", error: error.message });
    }
};

// ==========================================
// VÀO PHÒNG BẰNG ID HOẶC CODE
// ==========================================
exports.joinRoom = async (req, res) => {
    try {
        const userId = req.user.id;
        const { roomIdOrCode, password, gameTypeName } = req.body;

        if (!roomIdOrCode) {
            return res.status(400).json({ message: "Thiếu thông tin phòng cần vào" });
        }

        // Tìm phòng (hỗ trợ cả room_id dạng số hoặc room_code dạng chuỗi)
        const room = await Room.findOne({
            where: {
                [Op.or]: [
                    { room_id: isNaN(roomIdOrCode) ? -1 : parseInt(roomIdOrCode) },
                    { room_code: roomIdOrCode.toString().toUpperCase() }
                ]
            },
            include: [{ model: RoomPlayer }]
        });

        if (!room) {
            return res.status(404).json({ message: "Không tìm thấy phòng" });
        }

        // --- MỚI: KIỂM TRA LOẠI GAME ---
        if (gameTypeName) {
            const gameType = await GameType.findOne({ where: { name: gameTypeName } });
            if (gameType && room.game_type_id !== gameType.game_type_id) {
                const roomType = await GameType.findByPk(room.game_type_id);
                return res.status(400).json({ 
                    message: `Mã phòng này dành cho trò chơi "${roomType?.description || roomType?.name}", không phải trò chơi hiện tại.` 
                });
            }
        }

        // Kiểm tra xem user đã ở trong phòng này chưa
        const isAlreadyInRoom = room.RoomPlayers.some(p => p.user_id === userId);
        if (isAlreadyInRoom) {
            return res.json({ message: "Bạn đã ở trong phòng này rồi", room_id: room.room_id });
        }

        // Kiểm tra trạng thái phòng
        if (room.status !== "waiting") {
            return res.status(400).json({ message: "Phòng đang chơi hoặc đã kết thúc" });
        }

        // Kiểm tra mật khẩu (nếu có)
        if (room.is_private && room.password_hash) {
            if (!password) {
                return res.status(401).json({ message: "Phòng yêu cầu mật khẩu" });
            }
            const isMatch = await bcrypt.compare(password, room.password_hash);
            if (!isMatch) {
                return res.status(401).json({ message: "Mật khẩu phòng không đúng" });
            }
        }

        // Kiểm tra số lượng người (giả sử tối đa 2 player)
        const currentPlayers = room.RoomPlayers.filter(p => p.role.startsWith("player"));

        if (currentPlayers.length >= 2) {
            // Logic Mở Rộng: Nếu đầy 2 người chơi thì cho vào làm spectator (khán giả)
            // Hiện tại ta chặn luôn nếu chỉ chơi 1vs1
            return res.status(400).json({ message: "Phòng đã đủ người chơi" });
        }

        // Xác định role tiếp theo (nếu có host là player1, người tiếp sẽ là player2)
        const newRole = currentPlayers.some(p => p.role === "player1") ? "player2" : "player1";

        // Thêm user vào phòng
        await RoomPlayer.create({
            room_id: room.room_id,
            user_id: userId,
            role: newRole,
            is_ready: false // Cần user tự ấn ready
        });

        res.json({
            message: "Tham gia phòng thành công!",
            room: {
                room_id: room.room_id,
                room_code: room.room_code,
                role: newRole
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi Server khi Join Room!", error: error.message });
    }
};

// ==========================================
// TÌM PHÒNG NHANH
// ==========================================
exports.quickJoin = async (req, res) => {
    try {
        const userId = req.user.id;
        const { gameTypeName } = req.body;

        if (!gameTypeName) {
            return res.status(400).json({ message: "Vui lòng chọn loại game" });
        }

        const gameType = await GameType.findOne({ where: { name: gameTypeName } });
        if (!gameType) return res.status(404).json({ message: "Loại game không hợp lệ" });

        // Tìm room public đang waiting cho game tương ứng, ưu tiên phòng đã có 1 người (chưa đủ người)
        const availableRooms = await Room.findAll({
            where: {
                game_type_id: gameType.game_type_id,
                is_private: false,
                status: "waiting"
            },
            include: [{ model: RoomPlayer }]
        });

        // Lọc ra phòng < 2 người chơi và user chưa có mặt
        const validRooms = availableRooms.filter(room => {
            const players = room.RoomPlayers.filter(p => p.role.startsWith("player"));
            const alreadyIn = room.RoomPlayers.some(p => p.user_id === userId);
            return players.length < 2 && !alreadyIn;
        });

        if (validRooms.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy phòng trống. Bạn có thể tự tạo phòng mới." });
        }

        // Chọn phòng đầu tiên hoặc ngẫu nhiên
        const selectedRoom = validRooms[Math.floor(Math.random() * validRooms.length)];
        const currentPlayers = selectedRoom.RoomPlayers.filter(p => p.role.startsWith("player"));
        const newRole = currentPlayers.some(p => p.role === "player1") ? "player2" : "player1";

        await RoomPlayer.create({
            room_id: selectedRoom.room_id,
            user_id: userId,
            role: newRole,
            is_ready: false
        });

        res.json({
            message: "Tham gia phòng nhanh thành công!",
            room: {
                room_id: selectedRoom.room_id,
                room_code: selectedRoom.room_code,
                role: newRole
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi Quick Join!", error: error.message });
    }
};

// ==========================================
// XEM DANH SÁCH PHÒNG CỦA TÔI
// ==========================================
exports.getMyRooms = async (req, res) => {
    try {
        const userId = req.user.id;

        const myPlayers = await RoomPlayer.findAll({
            where: { user_id: userId },
            include: [{
                model: Room,
                include: [
                    { model: GameType, attributes: ["name"] },
                    { model: User, as: "host", attributes: ["username"] }
                ]
            }],
            order: [["joined_at", "DESC"]]
        });

        const formatted = myPlayers.map(p => ({
            room_id: p.Room.room_id,
            room_code: p.Room.room_code,
            game: p.Room.GameType.name,
            host: p.Room.host.username,
            status: p.Room.status,
            role: p.role,
            is_ready: p.is_ready,
            joined_at: p.joined_at
        }));

        res.json({
            total: formatted.length,
            rooms: formatted
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi GET My Rooms!", error: error.message });
    }
};
