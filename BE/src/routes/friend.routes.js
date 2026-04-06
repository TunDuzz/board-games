const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/friend.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Tất cả routes đều cần authentication
router.use(verifyToken);

// Danh sách bạn bè
router.get("/", async (req, res) => {
    try {
        const result = await getFriendsList({ userId: req.user.id, app: req.app });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// Lời mời đang chờ
router.get("/pending", async (req, res) => {
    try {
        const result = await getPendingRequests({ userId: req.user.id });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// Lời mời đã gửi
router.get("/sent", async (req, res) => {
    try {
        const result = await getSentRequests({ userId: req.user.id });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// Tìm kiếm người dùng
router.get("/search", async (req, res) => {
    try {
        const result = await searchUsers({ userId: req.user.id, query: req.query.q });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// Gửi lời mời kết bạn
router.post("/request/:userId", async (req, res) => {
    try {
        const result = await sendFriendRequest({
            fromUserId: req.user.id,
            toUserId: parseInt(req.params.userId),
            app: req.app
        });
        return res.status(201).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// Chấp nhận lời mời
router.post("/accept/:friendId", async (req, res) => {
    try {
        const result = await acceptFriendRequest({
            userId: req.user.id,
            friendId: parseInt(req.params.friendId),
            app: req.app
        });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// Từ chối lời mời
router.post("/reject/:friendId", async (req, res) => {
    try {
        const result = await rejectFriendRequest({
            userId: req.user.id,
            friendId: parseInt(req.params.friendId)
        });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// Xóa bạn
router.delete("/remove/:friendId", async (req, res) => {
    try {
        const result = await removeFriend({
            userId: req.user.id,
            friendId: parseInt(req.params.friendId)
        });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// Chặn người dùng
router.post("/block/:userId", async (req, res) => {
    try {
        const result = await blockUser({
            userId: req.user.id,
            blockedUserId: parseInt(req.params.userId)
        });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// Bỏ chặn
router.post("/unblock/:userId", async (req, res) => {
    try {
        const result = await unblockUser({
            userId: req.user.id,
            blockedUserId: parseInt(req.params.userId)
        });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

module.exports = router;
