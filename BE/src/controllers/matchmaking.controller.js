const { MatchmakingQueue, Room, RoomPlayer, GameType, User } = require("../models");
const sequelize = require("../config/database");
const { Op } = require("sequelize");

// Hàm sinh mã phòng ngẫu nhiên
const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// ==========================================
// THAM GIA HÀNG CHỜ GHÉP TRẬN
// ==========================================
exports.joinQueue = async ({ userId, gameTypeName }) => {
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

    const user = await User.findByPk(userId);
    if (!user) {
        const err = new Error("Không tìm thấy người dùng");
        err.statusCode = 404;
        throw err;
    }

    const isQueued = await MatchmakingQueue.findOne({ where: { user_id: userId } });
    if (isQueued) {
        console.log(`[Queue] User ${userId} is blocked by MatchmakingQueue row:`, isQueued.toJSON ? isQueued.toJSON() : isQueued);
        const err = new Error("Bạn đã đang trong hàng chờ tìm trận");
        err.statusCode = 400;
        throw err;
    }

    const playingRoom = await RoomPlayer.findOne({
        where: { user_id: userId },
        include: [{ model: Room, where: { status: "playing" } }]
    });
    if (playingRoom) {
        console.log(`[Queue] User ${userId} is blocked by playingRoom row:`, playingRoom.toJSON ? playingRoom.toJSON() : playingRoom);
        const err = new Error("Bạn đang trong một trận đấu, không thể tìm trận mới");
        err.statusCode = 400;
        throw err;
    }

    // Auto-clear các dòng RoomPlayer ở những phòng rác "waiting" bị kẹt
    const waitingRooms = await RoomPlayer.findAll({
        where: { user_id: userId },
        include: [{ model: Room, where: { status: "waiting" } }]
    });
    for (const wr of waitingRooms) {
        await wr.destroy();
    }

    const t = await sequelize.transaction();

    try {
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
            await opponent.destroy({ transaction: t });

            let room_code;
            let isUnique = false;
            while (!isUnique) {
                room_code = generateRoomCode();
                const existingRoom = await Room.findOne({ where: { room_code }, transaction: t });
                if (!existingRoom) isUnique = true;
            }

            const newRoom = await Room.create({
                game_type_id: gameType.game_type_id,
                host_id: opponent.user_id,
                is_private: false,
                room_code,
                status: "waiting"
            }, { transaction: t });

            await RoomPlayer.bulkCreate([
                { room_id: newRoom.room_id, user_id: opponent.user_id, role: "player1", is_ready: true },
                { room_id: newRoom.room_id, user_id: userId, role: "player2", is_ready: true }
            ], { transaction: t });

            await t.commit();

            return {
                message: "Đã tìm thấy trận đấu!",
                matched: true,
                room: {
                    room_id: newRoom.room_id,
                    room_code: newRoom.room_code,
                    game: gameTypeName,
                    role: "player2"
                }
            };
        } else {
            await MatchmakingQueue.create({
                user_id: userId,
                game_type_id: gameType.game_type_id,
                elo_snapshot: user.elo || 1000
            }, { transaction: t });

            await t.commit();

            return { message: "Đang tìm đối thủ...", matched: false };
        }
    } catch (innerError) {
        await t.rollback();
        throw innerError;
    }
};

// ==========================================
// KIỂM TRA TRẠNG THÁI GHÉP TRẬN
// ==========================================
exports.checkStatus = async ({ userId }) => {
    const queuedRecord = await MatchmakingQueue.findOne({ where: { user_id: userId } });

    if (queuedRecord) {
        return { matched: false, message: "Vẫn đang tìm trận..." };
    }

    const latestRoomPlay = await RoomPlayer.findOne({
        where: { user_id: userId },
        include: [{
            model: Room,
            where: { status: { [Op.in]: ["waiting", "playing"] }, is_private: false }
        }],
        order: [["joined_at", "DESC"]]
    });

    if (latestRoomPlay) {
        return {
            matched: true,
            message: "Đã tìm thấy trận đấu!",
            room: {
                room_id: latestRoomPlay.Room.room_id,
                room_code: latestRoomPlay.Room.room_code,
                role: latestRoomPlay.role
            }
        };
    } else {
        const err = new Error("Không tìm thấy phiên ghép trận. Vui lòng tìm lại.");
        err.statusCode = 404;
        throw err;
    }
};

// ==========================================
// HỦY TÌM TRẬN
// ==========================================
exports.cancelQueue = async ({ userId }) => {
    const deleted = await MatchmakingQueue.destroy({ where: { user_id: userId } });

    if (deleted) {
        return { message: "Đã hủy tìm trận thành công" };
    } else {
        const err = new Error("Bạn không ở trong hàng chờ");
        err.statusCode = 400;
        throw err;
    }
};
