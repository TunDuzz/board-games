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
exports.joinQueue = async (req, res) => {
    try {
        const userId = req.user.id;
        const { gameTypeName } = req.body;

        if (!gameTypeName) {
            return res.status(400).json({ message: "Vui lòng chọn loại game (chess, xiangqi, caro)" });
        }

        // 1. Lấy GameType và User Details
        const gameType = await GameType.findOne({ where: { name: gameTypeName } });
        if (!gameType) return res.status(404).json({ message: "Loại game không hợp lệ" });

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

        // 2. Kiểm tra user đã ở trong phòng hoặc đang queue chưa
        const isQueued = await MatchmakingQueue.findOne({ where: { user_id: userId } });
        if (isQueued) {
            console.log(`[Queue] User ${userId} is blocked by MatchmakingQueue row:`, isQueued.toJSON ? isQueued.toJSON() : isQueued);
            return res.status(400).json({ message: "Bạn đã đang trong hàng chờ tìm trận" });
        }

        // 2.2 Sửa lỗi rác phòng: Chỉ block nếu đang bận PLAYING
        const playingRoom = await RoomPlayer.findOne({
            where: { user_id: userId },
            include: [{
                model: Room,
                where: { status: "playing" }
            }]
        });

        if (playingRoom) {
            console.log(`[Queue] User ${userId} is blocked by playingRoom row:`, playingRoom.toJSON ? playingRoom.toJSON() : playingRoom);
            return res.status(400).json({ message: "Bạn đang trong một trận đấu, không thể tìm trận mới" });
        }

        // Auto-clear các dòng RoomPlayer ở những phòng rác "waiting" bị kẹt
        const waitingRooms = await RoomPlayer.findAll({
            where: { user_id: userId },
            include: [{
                model: Room,
                where: { status: "waiting" }
            }]
        });

        for (const wr of waitingRooms) {
            await wr.destroy();
        }

        // 3. Tìm đối thủ tiềm năng (cùng game type)
        // Lưu ý: Ở hệ thống lớn, cần Transaction chặn Race Condition 
        // Trong dự án nhỏ, ta dùng logic cơ bản lock qua sequelize
        const t = await sequelize.transaction();

        try {
            // Tìm 1 người đang chờ cùng game
            // Ở cấp độ nâng cao: order by `ABS(elo_snapshot - user.elo)` 
            const opponent = await MatchmakingQueue.findOne({
                where: {
                    game_type_id: gameType.game_type_id,
                    user_id: { [Op.ne]: userId } // Tránh tự ghép chính mình (dù đã check isQueued)
                },
                order: [['joined_at', 'ASC']], // Ưu tiên người chờ lâu nhất
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (opponent) {
                // ĐÃ TÌM THẤY ĐỐI THỦ!

                // 3.1 Xóa đối thủ khỏi queue
                await opponent.destroy({ transaction: t });

                // 3.2 Sinh mã phòng
                let room_code;
                let isUnique = false;
                while (!isUnique) {
                    room_code = generateRoomCode();
                    const existingRoom = await Room.findOne({ where: { room_code }, transaction: t });
                    if (!existingRoom) isUnique = true;
                }

                // 3.3 Tạo phòng mới. Chọn đối thủ (hoặc mình) làm host ngẫu nhiên.
                const newRoom = await Room.create({
                    game_type_id: gameType.game_type_id,
                    host_id: opponent.user_id, // Cho người chờ trước làm host
                    is_private: false,
                    room_code,
                    status: "waiting"
                }, { transaction: t });

                // 3.4 Thêm cả 2 vào phòng
                await RoomPlayer.bulkCreate([
                    { room_id: newRoom.room_id, user_id: opponent.user_id, role: "player1", is_ready: true },
                    { room_id: newRoom.room_id, user_id: userId, role: "player2", is_ready: true }
                ], { transaction: t });

                await t.commit();

                return res.status(200).json({
                    message: "Đã tìm thấy trận đấu!",
                    matched: true,
                    room: {
                        room_id: newRoom.room_id,
                        room_code: newRoom.room_code,
                        game: gameTypeName,
                        role: "player2" // Mình người vào sau nên làm player2
                    }
                });
            } else {
                // CHƯA CÓ ĐỐI THỦ -> VÀO HÀNG CHỜ
                await MatchmakingQueue.create({
                    user_id: userId,
                    game_type_id: gameType.game_type_id,
                    elo_snapshot: user.elo || 1000
                }, { transaction: t });

                await t.commit();

                return res.status(200).json({
                    message: "Đang tìm đối thủ...",
                    matched: false
                });
            }
        } catch (innerError) {
            await t.rollback();
            throw innerError;
        }

    } catch (error) {
        res.status(500).json({ message: "Lỗi tìm trận!", error: error.message });
    }
};

// ==========================================
// KIỂM TRA TRẠNG THÁI GHÉP TRẬN
// ==========================================
exports.checkStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Kiểm tra xem còn trong queue không
        const queuedRecord = await MatchmakingQueue.findOne({ where: { user_id: userId } });

        if (queuedRecord) {
            // Vẫn còn trong queue -> vẫn đang tìm
            return res.json({ matched: false, message: "Vẫn đang tìm trận..." });
        }

        // 2. Nếu không còn trong queue, có thể đã được ghép, hoặc đã hủy/bị văng.
        // Kiểm tra xem có phòng nào vừa được gán không
        // Giả định: Người chờ trước được ghép vào phòng mới nhất
        const latestRoomPlay = await RoomPlayer.findOne({
            where: { user_id: userId },
            include: [{
                model: Room,
                where: { status: { [Op.in]: ["waiting", "playing"] }, is_private: false }
            }],
            order: [["joined_at", "DESC"]]
        });

        if (latestRoomPlay) {
            return res.json({
                matched: true,
                message: "Đã tìm thấy trận đấu!",
                room: {
                    room_id: latestRoomPlay.Room.room_id,
                    room_code: latestRoomPlay.Room.room_code,
                    role: latestRoomPlay.role
                }
            });
        } else {
            // Không trong queue, không trong phòng -> Hỏng hoặc đã hủy
            return res.status(404).json({ message: "Không tìm thấy phiên ghép trận. Vui lòng tìm lại." });
        }

    } catch (error) {
        res.status(500).json({ message: "Lỗi kiểm tra trạng thái!", error: error.message });
    }
};

// ==========================================
// HỦY TÌM TRẬN
// ==========================================
exports.cancelQueue = async (req, res) => {
    try {
        const userId = req.user.id;

        const deleted = await MatchmakingQueue.destroy({
            where: { user_id: userId }
        });

        if (deleted) {
            return res.json({ message: "Đã hủy tìm trận thành công" });
        } else {
            return res.status(400).json({ message: "Bạn không ở trong hàng chờ" });
        }

    } catch (error) {
        res.status(500).json({ message: "Lỗi hủy tìm trận!", error: error.message });
    }
};
