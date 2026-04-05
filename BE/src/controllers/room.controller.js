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
exports.createRoom = async ({ userId, gameTypeName, password, is_private }) => {
    if (!gameTypeName) {
        const err = new Error("Vui lòng chọn loại game (chess, xiangqi, caro)");
        err.statusCode = 400;
        throw err;
    }

    const gameType = await GameType.findOne({ where: { name: gameTypeName } });
    if (!gameType) {
        const err = new Error("Loại game không hợp lệ");
        err.statusCode = 404;
        throw err;
    }

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

    return {
        message: "Tạo phòng thành công!",
        room: {
            room_id: newRoom.room_id,
            room_code: newRoom.room_code,
            game_name: gameTypeName,
            is_private: newRoom.is_private,
            status: newRoom.status
        }
    };
};

// ==========================================
// LẤY DANH SÁCH PHÒNG THEO GAME
// ==========================================
exports.getRoomsByGameType = async ({ gameTypeName }) => {
    const gameType = await GameType.findOne({ where: { name: gameTypeName } });
    if (!gameType) {
        const err = new Error("Loại game không hợp lệ");
        err.statusCode = 404;
        throw err;
    }

    const rooms = await Room.findAll({
        where: { game_type_id: gameType.game_type_id, status: "waiting", is_private: false },
        include: [
            { model: User, as: "host", attributes: ["user_id", "username", "avatar_url", "elo"] },
            { model: RoomPlayer, attributes: ["user_id", "role"] }
        ],
        order: [["created_at", "DESC"]],
        limit: 50
    });

    const formattedRooms = rooms.map(room => ({
        room_id: room.room_id,
        room_code: room.room_code,
        host_id: room.host_id,
        host_name: room.host.username,
        host_elo: room.host.elo,
        player_count: room.RoomPlayers.length,
        created_at: room.created_at
    }));

    return { game: gameTypeName, total: formattedRooms.length, rooms: formattedRooms };
};

// ==========================================
// VÀO PHÒNG BẰNG ID HOẶC CODE
// ==========================================
exports.joinRoom = async ({ userId, roomIdOrCode, password, gameTypeName }) => {
    if (!roomIdOrCode) {
        const err = new Error("Thiếu thông tin phòng cần vào");
        err.statusCode = 400;
        throw err;
    }

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
        const err = new Error("Không tìm thấy phòng");
        err.statusCode = 404;
        throw err;
    }

    if (gameTypeName) {
        const gameType = await GameType.findOne({ where: { name: gameTypeName } });
        if (gameType && room.game_type_id !== gameType.game_type_id) {
            const roomType = await GameType.findByPk(room.game_type_id);
            const err = new Error(`Mã phòng này dành cho trò chơi "${roomType?.description || roomType?.name}", không phải trò chơi hiện tại.`);
            err.statusCode = 400;
            throw err;
        }
    }

    const isAlreadyInRoom = room.RoomPlayers.some(p => p.user_id === userId);
    if (isAlreadyInRoom) {
        return { message: "Bạn đã ở trong phòng này rồi", room_id: room.room_id };
    }

    if (room.status !== "waiting") {
        const err = new Error("Phòng đang chơi hoặc đã kết thúc");
        err.statusCode = 400;
        throw err;
    }

    if (room.is_private && room.password_hash) {
        if (!password) {
            const err = new Error("Phòng yêu cầu mật khẩu");
            err.statusCode = 401;
            throw err;
        }
        const isMatch = await bcrypt.compare(password, room.password_hash);
        if (!isMatch) {
            const err = new Error("Mật khẩu phòng không đúng");
            err.statusCode = 401;
            throw err;
        }
    }

    const currentPlayers = room.RoomPlayers.filter(p => p.role.startsWith("player"));
    if (currentPlayers.length >= 2) {
        const err = new Error("Phòng đã đủ người chơi");
        err.statusCode = 400;
        throw err;
    }

    const newRole = currentPlayers.some(p => p.role === "player1") ? "player2" : "player1";

    await RoomPlayer.create({ room_id: room.room_id, user_id: userId, role: newRole, is_ready: false });

    return {
        message: "Tham gia phòng thành công!",
        room: { room_id: room.room_id, room_code: room.room_code, role: newRole }
    };
};

// ==========================================
// TÌM PHÒNG NHANH
// ==========================================
exports.quickJoin = async ({ userId, gameTypeName }) => {
    if (!gameTypeName) {
        const err = new Error("Vui lòng chọn loại game");
        err.statusCode = 400;
        throw err;
    }

    const gameType = await GameType.findOne({ where: { name: gameTypeName } });
    if (!gameType) {
        const err = new Error("Loại game không hợp lệ");
        err.statusCode = 404;
        throw err;
    }

    const availableRooms = await Room.findAll({
        where: { game_type_id: gameType.game_type_id, is_private: false, status: "waiting" },
        include: [{ model: RoomPlayer }]
    });

    const validRooms = availableRooms.filter(room => {
        const players = room.RoomPlayers.filter(p => p.role.startsWith("player"));
        const alreadyIn = room.RoomPlayers.some(p => p.user_id === userId);
        return players.length < 2 && !alreadyIn;
    });

    if (validRooms.length === 0) {
        const err = new Error("Không tìm thấy phòng trống. Bạn có thể tự tạo phòng mới.");
        err.statusCode = 404;
        throw err;
    }

    const selectedRoom = validRooms[Math.floor(Math.random() * validRooms.length)];
    const currentPlayers = selectedRoom.RoomPlayers.filter(p => p.role.startsWith("player"));
    const newRole = currentPlayers.some(p => p.role === "player1") ? "player2" : "player1";

    await RoomPlayer.create({ room_id: selectedRoom.room_id, user_id: userId, role: newRole, is_ready: false });

    return {
        message: "Tham gia phòng nhanh thành công!",
        room: { room_id: selectedRoom.room_id, room_code: selectedRoom.room_code, role: newRole }
    };
};

// ==========================================
// XEM DANH SÁCH PHÒNG CỦA TÔI
// ==========================================
exports.getMyRooms = async ({ userId }) => {
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

    return { total: formatted.length, rooms: formatted };
};
