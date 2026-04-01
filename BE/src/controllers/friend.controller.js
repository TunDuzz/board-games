const { User, Friend } = require("../models");
const { Op } = require("sequelize");

// Gửi lời mời kết bạn
const sendFriendRequest = async (req, res) => {
    try {
        const fromUserId = req.user.id;
        const toUserId = parseInt(req.params.userId);

        // Kiểm tra không thể tự gửi lời mời cho chính mình
        if (fromUserId === toUserId) {
            return res.status(400).json({ message: "Không thể gửi lời mời kết bạn cho chính mình!" });
        }

        // Kiểm tra người nhận có tồn tại không
        const toUser = await User.findByPk(toUserId);
        if (!toUser) {
            return res.status(404).json({ message: "Không tìm thấy người dùng!" });
        }

        // Kiểm tra xem đã bị block chưa
        const blocked = await Friend.findOne({
            where: {
                user_id: toUserId,
                friend_id: fromUserId,
                status: "blocked"
            }
        });

        if (blocked) {
            return res.status(403).json({ message: "Không thể gửi lời mời kết bạn!" });
        }

        // Kiểm tra xem đã có quan hệ bạn bè chưa
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
                return res.status(400).json({ message: "Đã là bạn bè rồi!" });
            }
            if (existingFriend.status === "pending") {
                return res.status(400).json({ message: "Lời mời kết bạn đã được gửi trước đó!" });
            }
        }

        // Tạo lời mời kết bạn
        const friendRequest = await Friend.create({
            user_id: fromUserId,
            friend_id: toUserId,
            status: "pending"
        });

        // Gửi thông báo socket real-time nếu người nhận online
        const io = req.app.get("io");
        const users = req.app.get("onlineUsers");
        
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

        res.status(201).json({
            message: "Đã gửi lời mời kết bạn!",
            request: friendRequest
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

// Chấp nhận lời mời kết bạn
const acceptFriendRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const friendId = parseInt(req.params.friendId);

        // Tìm lời mời kết bạn
        const friendRequest = await Friend.findOne({
            where: {
                user_id: friendId,
                friend_id: userId,
                status: "pending"
            }
        });

        if (!friendRequest) {
            return res.status(404).json({ message: "Không tìm thấy lời mời kết bạn!" });
        }

        // Cập nhật trạng thái thành accepted
        friendRequest.status = "accepted";
        await friendRequest.save();

        // Tạo quan hệ ngược lại (2 chiều)
        await Friend.create({
            user_id: userId,
            friend_id: friendId,
            status: "accepted"
        });

        // Gửi thông báo socket real-time nếu người gửi online
        const io = req.app.get("io");
        const users = req.app.get("onlineUsers");
        if (io && users) {
            const requesterSocketId = users.get(friendId);
            if (requesterSocketId) {
                const acceptor = await User.findByPk(userId, {
                    attributes: ["user_id", "username", "full_name", "avatar_url"]
                });
                io.to(requesterSocketId).emit("friend_request_accepted", {
                    fromUser: acceptor
                });
            }
        }

        res.json({
            message: "Đã chấp nhận lời mời kết bạn!",
            friendship: friendRequest
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

// Từ chối lời mời kết bạn
const rejectFriendRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const friendId = parseInt(req.params.friendId);

        // Tìm và xóa lời mời kết bạn
        const deleted = await Friend.destroy({
            where: {
                user_id: friendId,
                friend_id: userId,
                status: "pending"
            }
        });

        if (!deleted) {
            return res.status(404).json({ message: "Không tìm thấy lời mời kết bạn!" });
        }

        res.json({ message: "Đã từ chối lời mời kết bạn!" });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

// Xóa bạn bè
const removeFriend = async (req, res) => {
    try {
        const userId = req.user.id;
        const friendId = parseInt(req.params.friendId);

        // Xóa cả 2 chiều của quan hệ bạn bè
        const deleted = await Friend.destroy({
            where: {
                [Op.or]: [
                    { user_id: userId, friend_id: friendId, status: "accepted" },
                    { user_id: friendId, friend_id: userId, status: "accepted" }
                ]
            }
        });

        if (!deleted) {
            return res.status(404).json({ message: "Không tìm thấy quan hệ bạn bè!" });
        }

        res.json({ message: "Đã xóa bạn bè!" });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

// Chặn người dùng
const blockUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const blockedUserId = parseInt(req.params.userId);

        if (userId === blockedUserId) {
            return res.status(400).json({ message: "Không thể chặn chính mình!" });
        }

        // Xóa quan hệ bạn bè nếu có
        await Friend.destroy({
            where: {
                [Op.or]: [
                    { user_id: userId, friend_id: blockedUserId },
                    { user_id: blockedUserId, friend_id: userId }
                ]
            }
        });

        // Tạo quan hệ block
        const [blocked, created] = await Friend.findOrCreate({
            where: {
                user_id: userId,
                friend_id: blockedUserId
            },
            defaults: {
                status: "blocked"
            }
        });

        if (!created) {
            blocked.status = "blocked";
            await blocked.save();
        }

        res.json({ message: "Đã chặn người dùng!" });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

// Bỏ chặn người dùng
const unblockUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const blockedUserId = parseInt(req.params.userId);

        const deleted = await Friend.destroy({
            where: {
                user_id: userId,
                friend_id: blockedUserId,
                status: "blocked"
            }
        });

        if (!deleted) {
            return res.status(404).json({ message: "Người dùng chưa bị chặn!" });
        }

        res.json({ message: "Đã bỏ chặn người dùng!" });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

// Lấy danh sách bạn bè
const getFriendsList = async (req, res) => {
    try {
        const userId = req.user.id;
        const onlineUsers = req.app.get("onlineUsers") || new Map();
        const inGameUsers = req.app.get("inGameUsers") || new Map();

        const friends = await Friend.findAll({
            where: {
                user_id: userId,
                status: "accepted"
            },
            include: [
                {
                    model: User,
                    as: "friendUser",
                    attributes: ["user_id", "username", "full_name", "avatar_url"]
                }
            ]
        });

        const friendsWithStatus = friends.map(f => {
            const friendData = f.friendUser.toJSON();
            let status = "offline";
            if (inGameUsers.has(friendData.user_id)) {
                status = "in_game";
            } else if (onlineUsers.has(friendData.user_id)) {
                status = "online";
            }
            
            return {
                ...friendData,
                status
            };
        });

        res.json({
            message: "Lấy danh sách bạn bè thành công!",
            friends: friendsWithStatus
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

// Lấy danh sách lời mời đang chờ (nhận được)
const getPendingRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        const requests = await Friend.findAll({
            where: {
                friend_id: userId,
                status: "pending"
            },
            include: [
                {
                    model: User,
                    as: "user",
                    attributes: ["user_id", "username", "full_name", "avatar_url"]
                }
            ],
            order: [["created_at", "DESC"]]
        });

        res.json({
            total: requests.length,
            requests: requests.map(r => ({
                id: r.id,
                from: r.user,
                created_at: r.created_at
            }))
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

// Lấy danh sách lời mời đã gửi
const getSentRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        const requests = await Friend.findAll({
            where: {
                user_id: userId,
                status: "pending"
            },
            include: [
                {
                    model: User,
                    as: "friendUser",
                    attributes: ["user_id", "username", "full_name", "avatar_url"]
                }
            ],
            order: [["created_at", "DESC"]]
        });

        res.json({
            total: requests.length,
            requests: requests.map(r => ({
                id: r.id,
                to: r.friendUser,
                created_at: r.created_at
            }))
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

// Tìm kiếm người dùng
const searchUsers = async (req, res) => {
    try {
        const userId = req.user.id;
        const query = req.query.q;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({ message: "Vui lòng nhập ít nhất 2 ký tự để tìm kiếm!" });
        }

        // Tìm người dùng theo username hoặc full_name
        const users = await User.findAll({
            where: {
                user_id: { [Op.ne]: userId }, // Không bao gồm chính mình
                [Op.or]: [
                    { username: { [Op.like]: `%${query}%` } },
                    { full_name: { [Op.like]: `%${query}%` } }
                ]
            },
            attributes: ["user_id", "username", "full_name", "avatar_url"],
            limit: 20
        });

        // Lấy trạng thái quan hệ với từng user
        const userIds = users.map(u => u.user_id);
        const relationships = await Friend.findAll({
            where: {
                [Op.or]: [
                    { user_id: userId, friend_id: { [Op.in]: userIds } },
                    { user_id: { [Op.in]: userIds }, friend_id: userId }
                ]
            }
        });

        // Map trạng thái
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

        res.json({
            total: results.length,
            users: results
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
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
