const { User, Friend, GameInvite, Room, RoomPlayer, GameType } = require("../models");
const { Op } = require("sequelize");

// Gửi lời mời chơi game
const sendGameInvite = async (req, res) => {
    try {
        const fromUserId = req.user.id;
        const { to_user_id, room_id } = req.body;

        // Validate input
        if (!to_user_id || !room_id) {
            return res.status(400).json({ message: "Thiếu thông tin to_user_id hoặc room_id!" });
        }

        // Kiểm tra không thể mời chính mình
        if (fromUserId === to_user_id) {
            return res.status(400).json({ message: "Không thể mời chính mình!" });
        }

        // Kiểm tra room có tồn tại không
        const room = await Room.findByPk(room_id);
        if (!room) {
            return res.status(404).json({ message: "Không tìm thấy phòng chơi!" });
        }

        // Kiểm tra room đang ở trạng thái waiting
        if (room.status !== "waiting") {
            return res.status(400).json({ message: "Phòng chơi không ở trạng thái chờ!" });
        }

        // Kiểm tra người gửi phải là host
        if (room.host_id !== fromUserId) {
            return res.status(403).json({ message: "Chỉ host mới có thể gửi lời mời!" });
        }

        // Kiểm tra người nhận có tồn tại không
        const toUser = await User.findByPk(to_user_id);
        if (!toUser) {
            return res.status(404).json({ message: "Không tìm thấy người dùng!" });
        }

        // Kiểm tra có phải bạn bè không
        const friendship = await Friend.findOne({
            where: {
                user_id: fromUserId,
                friend_id: to_user_id,
                status: "accepted"
            }
        });

        if (!friendship) {
            return res.status(403).json({ message: "Chỉ có thể mời bạn bè!" });
        }

        // Kiểm tra đã có lời mời pending chưa
        const existingInvite = await GameInvite.findOne({
            where: {
                room_id,
                to_user_id,
                status: "pending"
            }
        });

        if (existingInvite) {
            return res.status(400).json({ message: "Đã có lời mời đang chờ cho người dùng này!" });
        }

        // Tạo lời mời với thời gian hết hạn (15 phút)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        const invite = await GameInvite.create({
            room_id,
            from_user_id: fromUserId,
            to_user_id,
            status: "pending",
            expires_at: expiresAt
        });

        // Include thông tin user và room
        const inviteWithDetails = await GameInvite.findByPk(invite.invite_id, {
            include: [
                { model: User, as: "fromUser", attributes: ["user_id", "username", "avatar_url"] },
                { model: User, as: "toUser", attributes: ["user_id", "username", "avatar_url"] },
                { model: Room, attributes: ["room_id", "room_code", "status"] }
            ]
        });

        res.status(201).json({
            message: "Đã gửi lời mời chơi game!",
            invite: inviteWithDetails
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

// Chấp nhận lời mời chơi game
const acceptGameInvite = async (req, res) => {
    try {
        const userId = req.user.id;
        const inviteId = parseInt(req.params.inviteId);

        // Tìm lời mời kèm theo Room và RoomPlayers hiện tại
        const invite = await GameInvite.findByPk(inviteId, {
            include: [{ 
                model: Room,
                include: [{ model: RoomPlayer }]
            }]
        });

        if (!invite) {
            return res.status(404).json({ message: "Không tìm thấy lời mời!" });
        }

        // Kiểm tra lời mời có dành cho user này không
        if (invite.to_user_id !== userId) {
            return res.status(403).json({ message: "Lời mời không dành cho bạn!" });
        }

        // Kiểm tra trạng thái
        if (invite.status !== "pending") {
            return res.status(400).json({ message: "Lời mời đã được xử lý!" });
        }

        // Kiểm tra hết hạn
        if (invite.expires_at && new Date() > new Date(invite.expires_at)) {
            invite.status = "expired";
            await invite.save();
            return res.status(400).json({ message: "Lời mời đã hết hạn!" });
        }

        // Kiểm tra room còn ở trạng thái waiting không
        if (invite.Room.status !== "waiting") {
            invite.status = "expired";
            await invite.save();
            return res.status(400).json({ message: "Phòng chơi đã bắt đầu hoặc kết thúc!" });
        }

        // 1. Xác định role (player1 hoặc player2) cho người tham gia
        const currentPlayers = invite.Room.RoomPlayers.filter(p => p.role.startsWith("player"));
        
        if (currentPlayers.length >= 2) {
            return res.status(400).json({ message: "Phòng đã đủ người chơi!" });
        }

        const newRole = currentPlayers.some(p => p.role === "player1") ? "player2" : "player1";

        // 2. Thêm người chơi vào room TRƯỚC khi cập nhật trạng thái lời mời
        // để hỗ trợ retry nếu chẳng may có crash Database
        const [roomPlayer, created] = await RoomPlayer.findOrCreate({
            where: {
                room_id: invite.room_id,
                user_id: userId
            },
            defaults: {
                role: newRole,
                is_ready: false
            }
        });

        // 3. Cập nhật trạng thái lời mời THÀNH CÔNG
        invite.status = "accepted";
        await invite.save();

        res.json({
            message: "Đã chấp nhận lời mời! Bạn đã tham gia phòng chơi.",
            invite,
            room_player: roomPlayer
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

// Từ chối lời mời chơi game
const rejectGameInvite = async (req, res) => {
    try {
        const userId = req.user.id;
        const inviteId = parseInt(req.params.inviteId);

        // Tìm lời mời
        const invite = await GameInvite.findByPk(inviteId);

        if (!invite) {
            return res.status(404).json({ message: "Không tìm thấy lời mời!" });
        }

        // Kiểm tra lời mời có dành cho user này không
        if (invite.to_user_id !== userId) {
            return res.status(403).json({ message: "Lời mời không dành cho bạn!" });
        }

        // Kiểm tra trạng thái
        if (invite.status !== "pending") {
            return res.status(400).json({ message: "Lời mời đã được xử lý!" });
        }

        // Cập nhật trạng thái
        invite.status = "rejected";
        await invite.save();

        res.json({
            message: "Đã từ chối lời mời!",
            invite
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

// Hủy lời mời đã gửi
const cancelGameInvite = async (req, res) => {
    try {
        const userId = req.user.id;
        const inviteId = parseInt(req.params.inviteId);

        // Tìm lời mời
        const invite = await GameInvite.findByPk(inviteId);

        if (!invite) {
            return res.status(404).json({ message: "Không tìm thấy lời mời!" });
        }

        // Kiểm tra lời mời có do user này gửi không
        if (invite.from_user_id !== userId) {
            return res.status(403).json({ message: "Bạn không thể hủy lời mời này!" });
        }

        // Kiểm tra trạng thái
        if (invite.status !== "pending") {
            return res.status(400).json({ message: "Lời mời đã được xử lý!" });
        }

        // Cập nhật trạng thái
        invite.status = "cancelled";
        await invite.save();

        res.json({
            message: "Đã hủy lời mời!",
            invite
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

// Lấy danh sách lời mời đã nhận
const getReceivedInvites = async (req, res) => {
    try {
        const userId = req.user.id;

        const invites = await GameInvite.findAll({
            where: {
                to_user_id: userId,
                status: "pending",
                expires_at: {
                    [Op.or]: [
                        { [Op.gt]: new Date() }, // Chưa hết hạn
                        { [Op.is]: null }        // Không có thời hạn
                    ]
                }
            },
            include: [
                { model: User, as: "fromUser", attributes: ["user_id", "username", "full_name", "avatar_url"] },
                { 
                    model: Room, 
                    attributes: ["room_id", "room_code", "status", "game_type_id"],
                    include: [{ model: GameType, attributes: ["name"] }]
                }
            ],
            order: [["created_at", "DESC"]]
        });

        res.json({
            total: invites.length,
            invites
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

// Lấy danh sách lời mời đã gửi
const getSentInvites = async (req, res) => {
    try {
        const userId = req.user.id;

        const invites = await GameInvite.findAll({
            where: {
                from_user_id: userId
            },
            include: [
                { model: User, as: "toUser", attributes: ["user_id", "username", "full_name", "avatar_url"] },
                { model: Room, attributes: ["room_id", "room_code", "status"] }
            ],
            order: [["created_at", "DESC"]],
            limit: 50
        });

        res.json({
            total: invites.length,
            invites
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

module.exports = {
    sendGameInvite,
    acceptGameInvite,
    rejectGameInvite,
    cancelGameInvite,
    getReceivedInvites,
    getSentInvites
};
