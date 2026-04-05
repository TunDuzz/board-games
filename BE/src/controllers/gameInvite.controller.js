const { User, Friend, GameInvite, Room, RoomPlayer, GameType } = require("../models");
const { Op } = require("sequelize");

// Gửi lời mời chơi game
const sendGameInvite = async ({ fromUserId, to_user_id, room_id, app }) => {
    if (!to_user_id || !room_id) {
        const err = new Error("Thiếu thông tin to_user_id hoặc room_id!");
        err.statusCode = 400;
        throw err;
    }

    if (fromUserId === to_user_id) {
        const err = new Error("Không thể mời chính mình!");
        err.statusCode = 400;
        throw err;
    }

    const room = await Room.findByPk(room_id);
    if (!room) {
        const err = new Error("Không tìm thấy phòng chơi!");
        err.statusCode = 404;
        throw err;
    }

    if (room.status !== "waiting") {
        const err = new Error("Phòng chơi không ở trạng thái chờ!");
        err.statusCode = 400;
        throw err;
    }

    if (room.host_id !== fromUserId) {
        const err = new Error("Chỉ host mới có thể gửi lời mời!");
        err.statusCode = 403;
        throw err;
    }

    const toUser = await User.findByPk(to_user_id);
    if (!toUser) {
        const err = new Error("Không tìm thấy người dùng!");
        err.statusCode = 404;
        throw err;
    }

    const friendship = await Friend.findOne({
        where: { user_id: fromUserId, friend_id: to_user_id, status: "accepted" }
    });
    if (!friendship) {
        const err = new Error("Chỉ có thể mời bạn bè!");
        err.statusCode = 403;
        throw err;
    }

    const existingInvite = await GameInvite.findOne({
        where: { room_id, to_user_id, status: "pending" }
    });
    if (existingInvite) {
        const err = new Error("Đã có lời mời đang chờ cho người dùng này!");
        err.statusCode = 400;
        throw err;
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const invite = await GameInvite.create({
        room_id,
        from_user_id: fromUserId,
        to_user_id,
        status: "pending",
        expires_at: expiresAt
    });

    const inviteWithDetails = await GameInvite.findByPk(invite.invite_id, {
        include: [
            { model: User, as: "fromUser", attributes: ["user_id", "username", "avatar_url"] },
            { model: User, as: "toUser", attributes: ["user_id", "username", "avatar_url"] },
            { model: Room, attributes: ["room_id", "room_code", "status"] }
        ]
    });

    // Gửi thông báo socket real-time
    if (app) {
        const io = app.get("io");
        const users = app.get("onlineUsers");
        if (io && users) {
            const recipientSocketId = users.get(to_user_id);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("game_invite_received", { invite: inviteWithDetails });
            }
        }
    }

    return { message: "Đã gửi lời mời chơi game!", invite: inviteWithDetails };
};

// Chấp nhận lời mời chơi game
const acceptGameInvite = async ({ userId, inviteId }) => {
    const invite = await GameInvite.findByPk(inviteId, {
        include: [{ model: Room, include: [{ model: RoomPlayer }] }]
    });

    if (!invite) {
        const err = new Error("Không tìm thấy lời mời!");
        err.statusCode = 404;
        throw err;
    }

    if (invite.to_user_id !== userId) {
        const err = new Error("Lời mời không dành cho bạn!");
        err.statusCode = 403;
        throw err;
    }

    if (invite.status !== "pending") {
        const err = new Error("Lời mời đã được xử lý!");
        err.statusCode = 400;
        throw err;
    }

    if (invite.expires_at && new Date() > new Date(invite.expires_at)) {
        invite.status = "expired";
        await invite.save();
        const err = new Error("Lời mời đã hết hạn!");
        err.statusCode = 400;
        throw err;
    }

    if (invite.Room.status !== "waiting") {
        invite.status = "expired";
        await invite.save();
        const err = new Error("Phòng chơi đã bắt đầu hoặc kết thúc!");
        err.statusCode = 400;
        throw err;
    }

    const currentPlayers = invite.Room.RoomPlayers.filter(p => p.role.startsWith("player"));
    if (currentPlayers.length >= 2) {
        const err = new Error("Phòng đã đủ người chơi!");
        err.statusCode = 400;
        throw err;
    }

    const newRole = currentPlayers.some(p => p.role === "player1") ? "player2" : "player1";

    const [roomPlayer] = await RoomPlayer.findOrCreate({
        where: { room_id: invite.room_id, user_id: userId },
        defaults: { role: newRole, is_ready: false }
    });

    invite.status = "accepted";
    await invite.save();

    return { message: "Đã chấp nhận lời mời! Bạn đã tham gia phòng chơi.", invite, room_player: roomPlayer };
};

// Từ chối lời mời chơi game
const rejectGameInvite = async ({ userId, inviteId }) => {
    const invite = await GameInvite.findByPk(inviteId);
    if (!invite) {
        const err = new Error("Không tìm thấy lời mời!");
        err.statusCode = 404;
        throw err;
    }

    if (invite.to_user_id !== userId) {
        const err = new Error("Lời mời không dành cho bạn!");
        err.statusCode = 403;
        throw err;
    }

    if (invite.status !== "pending") {
        const err = new Error("Lời mời đã được xử lý!");
        err.statusCode = 400;
        throw err;
    }

    invite.status = "rejected";
    await invite.save();

    return { message: "Đã từ chối lời mời!", invite };
};

// Hủy lời mời đã gửi
const cancelGameInvite = async ({ userId, inviteId }) => {
    const invite = await GameInvite.findByPk(inviteId);
    if (!invite) {
        const err = new Error("Không tìm thấy lời mời!");
        err.statusCode = 404;
        throw err;
    }

    if (invite.from_user_id !== userId) {
        const err = new Error("Bạn không thể hủy lời mời này!");
        err.statusCode = 403;
        throw err;
    }

    if (invite.status !== "pending") {
        const err = new Error("Lời mời đã được xử lý!");
        err.statusCode = 400;
        throw err;
    }

    invite.status = "cancelled";
    await invite.save();

    return { message: "Đã hủy lời mời!", invite };
};

// Lấy danh sách lời mời đã nhận
const getReceivedInvites = async ({ userId }) => {
    const invites = await GameInvite.findAll({
        where: {
            to_user_id: userId,
            status: "pending",
            expires_at: {
                [Op.or]: [
                    { [Op.gt]: new Date() },
                    { [Op.is]: null }
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

    return { total: invites.length, invites };
};

// Lấy danh sách lời mời đã gửi
const getSentInvites = async ({ userId }) => {
    const invites = await GameInvite.findAll({
        where: { from_user_id: userId },
        include: [
            { model: User, as: "toUser", attributes: ["user_id", "username", "full_name", "avatar_url"] },
            { model: Room, attributes: ["room_id", "room_code", "status"] }
        ],
        order: [["created_at", "DESC"]],
        limit: 50
    });

    return { total: invites.length, invites };
};

module.exports = {
    sendGameInvite,
    acceptGameInvite,
    rejectGameInvite,
    cancelGameInvite,
    getReceivedInvites,
    getSentInvites
};
