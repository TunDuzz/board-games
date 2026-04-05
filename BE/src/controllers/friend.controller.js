const { User, Friend } = require("../models");
const { Op } = require("sequelize");

// Gửi lời mời kết bạn
const sendFriendRequest = async ({ fromUserId, toUserId, app }) => {
    if (fromUserId === toUserId) {
        const err = new Error("Không thể gửi lời mời kết bạn cho chính mình!");
        err.statusCode = 400;
        throw err;
    }

    const toUser = await User.findByPk(toUserId);
    if (!toUser) {
        const err = new Error("Không tìm thấy người dùng!");
        err.statusCode = 404;
        throw err;
    }

    const blocked = await Friend.findOne({
        where: { user_id: toUserId, friend_id: fromUserId, status: "blocked" }
    });
    if (blocked) {
        const err = new Error("Không thể gửi lời mời kết bạn!");
        err.statusCode = 403;
        throw err;
    }

    const existingFriend = await Friend.findOne({
        where: {
            [Op.or]: [
                { user_id: fromUserId, friend_id: toUserId },
                { user_id: toUserId, friend_id: fromUserId }
            ]
        }
    });

    if (existingFriend) {
        if (existingFriend.status === "accepted") {
            const err = new Error("Đã là bạn bè rồi!");
            err.statusCode = 400;
            throw err;
        }
        if (existingFriend.status === "pending") {
            const err = new Error("Lời mời kết bạn đã được gửi trước đó!");
            err.statusCode = 400;
            throw err;
        }
    }

    const friendRequest = await Friend.create({
        user_id: fromUserId,
        friend_id: toUserId,
        status: "pending"
    });

    // Gửi thông báo socket real-time nếu người nhận online
    if (app) {
        const io = app.get("io");
        const users = app.get("onlineUsers");
        if (io && users) {
            const recipientSocketId = users.get(toUserId);
            if (recipientSocketId) {
                const sender = await User.findByPk(fromUserId, {
                    attributes: ["user_id", "username", "full_name", "avatar_url"]
                });
                io.to(recipientSocketId).emit("friend_request_received", {
                    fromUser: sender,
                    request_id: friendRequest.id
                });
            }
        }
    }

    return { message: "Đã gửi lời mời kết bạn!", request: friendRequest };
};

// Chấp nhận lời mời kết bạn
const acceptFriendRequest = async ({ userId, friendId, app }) => {
    const friendRequest = await Friend.findOne({
        where: { user_id: friendId, friend_id: userId, status: "pending" }
    });
    if (!friendRequest) {
        const err = new Error("Không tìm thấy lời mời kết bạn!");
        err.statusCode = 404;
        throw err;
    }

    friendRequest.status = "accepted";
    await friendRequest.save();

    await Friend.create({ user_id: userId, friend_id: friendId, status: "accepted" });

    if (app) {
        const io = app.get("io");
        const users = app.get("onlineUsers");
        if (io && users) {
            const requesterSocketId = users.get(friendId);
            if (requesterSocketId) {
                const acceptor = await User.findByPk(userId, {
                    attributes: ["user_id", "username", "full_name", "avatar_url"]
                });
                io.to(requesterSocketId).emit("friend_request_accepted", { fromUser: acceptor });
            }
        }
    }

    return { message: "Đã chấp nhận lời mời kết bạn!", friendship: friendRequest };
};

// Từ chối lời mời kết bạn
const rejectFriendRequest = async ({ userId, friendId }) => {
    const deleted = await Friend.destroy({
        where: { user_id: friendId, friend_id: userId, status: "pending" }
    });
    if (!deleted) {
        const err = new Error("Không tìm thấy lời mời kết bạn!");
        err.statusCode = 404;
        throw err;
    }
    return { message: "Đã từ chối lời mời kết bạn!" };
};

// Xóa bạn bè
const removeFriend = async ({ userId, friendId }) => {
    const deleted = await Friend.destroy({
        where: {
            [Op.or]: [
                { user_id: userId, friend_id: friendId, status: "accepted" },
                { user_id: friendId, friend_id: userId, status: "accepted" }
            ]
        }
    });
    if (!deleted) {
        const err = new Error("Không tìm thấy quan hệ bạn bè!");
        err.statusCode = 404;
        throw err;
    }
    return { message: "Đã xóa bạn bè!" };
};

// Chặn người dùng
const blockUser = async ({ userId, blockedUserId }) => {
    if (userId === blockedUserId) {
        const err = new Error("Không thể chặn chính mình!");
        err.statusCode = 400;
        throw err;
    }

    await Friend.destroy({
        where: {
            [Op.or]: [
                { user_id: userId, friend_id: blockedUserId },
                { user_id: blockedUserId, friend_id: userId }
            ]
        }
    });

    const [blocked, created] = await Friend.findOrCreate({
        where: { user_id: userId, friend_id: blockedUserId },
        defaults: { status: "blocked" }
    });
    if (!created) {
        blocked.status = "blocked";
        await blocked.save();
    }

    return { message: "Đã chặn người dùng!" };
};

// Bỏ chặn người dùng
const unblockUser = async ({ userId, blockedUserId }) => {
    const deleted = await Friend.destroy({
        where: { user_id: userId, friend_id: blockedUserId, status: "blocked" }
    });
    if (!deleted) {
        const err = new Error("Người dùng chưa bị chặn!");
        err.statusCode = 404;
        throw err;
    }
    return { message: "Đã bỏ chặn người dùng!" };
};

// Lấy danh sách bạn bè
const getFriendsList = async ({ userId, app }) => {
    const onlineUsers = app ? (app.get("onlineUsers") || new Map()) : new Map();
    const inGameUsers = app ? (app.get("inGameUsers") || new Map()) : new Map();

    const friends = await Friend.findAll({
        where: { user_id: userId, status: "accepted" },
        include: [{
            model: User,
            as: "friendUser",
            attributes: ["user_id", "username", "full_name", "avatar_url"]
        }]
    });

    const friendsWithStatus = friends.map(f => {
        const friendData = f.friendUser.toJSON();
        let status = "offline";
        if (inGameUsers.has(friendData.user_id)) {
            status = "in_game";
        } else if (onlineUsers.has(friendData.user_id)) {
            status = "online";
        }
        return { ...friendData, status };
    });

    return { message: "Lấy danh sách bạn bè thành công!", friends: friendsWithStatus };
};

// Lấy danh sách lời mời đang chờ (nhận được)
const getPendingRequests = async ({ userId }) => {
    const requests = await Friend.findAll({
        where: { friend_id: userId, status: "pending" },
        include: [{
            model: User,
            as: "user",
            attributes: ["user_id", "username", "full_name", "avatar_url"]
        }],
        order: [["created_at", "DESC"]]
    });

    return {
        total: requests.length,
        requests: requests.map(r => ({
            id: r.id,
            from: r.user,
            created_at: r.created_at
        }))
    };
};

// Lấy danh sách lời mời đã gửi
const getSentRequests = async ({ userId }) => {
    const requests = await Friend.findAll({
        where: { user_id: userId, status: "pending" },
        include: [{
            model: User,
            as: "friendUser",
            attributes: ["user_id", "username", "full_name", "avatar_url"]
        }],
        order: [["created_at", "DESC"]]
    });

    return {
        total: requests.length,
        requests: requests.map(r => ({
            id: r.id,
            to: r.friendUser,
            created_at: r.created_at
        }))
    };
};

// Tìm kiếm người dùng
const searchUsers = async ({ userId, query }) => {
    if (!query || query.trim().length < 2) {
        const err = new Error("Vui lòng nhập ít nhất 2 ký tự để tìm kiếm!");
        err.statusCode = 400;
        throw err;
    }

    const users = await User.findAll({
        where: {
            user_id: { [Op.ne]: userId },
            [Op.or]: [
                { username: { [Op.like]: `%${query}%` } },
                { full_name: { [Op.like]: `%${query}%` } }
            ]
        },
        attributes: ["user_id", "username", "full_name", "avatar_url"],
        limit: 20
    });

    const userIds = users.map(u => u.user_id);
    const relationships = await Friend.findAll({
        where: {
            [Op.or]: [
                { user_id: userId, friend_id: { [Op.in]: userIds } },
                { user_id: { [Op.in]: userIds }, friend_id: userId }
            ]
        }
    });

    const relationshipMap = {};
    relationships.forEach(rel => {
        const otherUserId = rel.user_id === userId ? rel.friend_id : rel.user_id;
        if (rel.status === "accepted") {
            relationshipMap[otherUserId] = "friend";
        } else if (rel.status === "pending") {
            if (rel.user_id === userId) {
                relationshipMap[otherUserId] = "request_sent";
            } else {
                relationshipMap[otherUserId] = "request_received";
            }
        } else if (rel.status === "blocked" && rel.user_id === userId) {
            relationshipMap[otherUserId] = "blocked";
        }
    });

    const results = users.map(user => ({
        ...user.toJSON(),
        relationship: relationshipMap[user.user_id] || "none"
    }));

    return { total: results.length, users: results };
};

module.exports = {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    getFriendsList,
    getPendingRequests,
    getSentRequests,
    searchUsers
};
