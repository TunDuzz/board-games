const express = require("express");
const router = express.Router();
const {
    sendGameInvite,
    acceptGameInvite,
    rejectGameInvite,
    cancelGameInvite,
    getReceivedInvites,
    getSentInvites
} = require("../controllers/gameInvite.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Tất cả routes đều cần authentication
router.use(verifyToken);

// Gửi lời mời
router.post("/send", async (req, res) => {
    try {
        const { to_user_id, room_id } = req.body;
        const result = await sendGameInvite({ fromUserId: req.user.id, to_user_id, room_id, app: req.app });
        return res.status(201).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// Chấp nhận lời mời
router.post("/accept/:inviteId", async (req, res) => {
    try {
        const result = await acceptGameInvite({ userId: req.user.id, inviteId: parseInt(req.params.inviteId) });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// Từ chối lời mời
router.post("/reject/:inviteId", async (req, res) => {
    try {
        const result = await rejectGameInvite({ userId: req.user.id, inviteId: parseInt(req.params.inviteId) });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// Hủy lời mời
router.delete("/cancel/:inviteId", async (req, res) => {
    try {
        const result = await cancelGameInvite({ userId: req.user.id, inviteId: parseInt(req.params.inviteId) });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// Lời mời đã nhận
router.get("/received", async (req, res) => {
    try {
        const result = await getReceivedInvites({ userId: req.user.id });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// Lời mời đã gửi
router.get("/sent", async (req, res) => {
    try {
        const result = await getSentInvites({ userId: req.user.id });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

module.exports = router;
