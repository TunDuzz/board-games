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

// Quản lý lời mời game
router.post("/send", sendGameInvite);                  // Gửi lời mời
router.post("/accept/:inviteId", acceptGameInvite);    // Chấp nhận
router.post("/reject/:inviteId", rejectGameInvite);    // Từ chối
router.delete("/cancel/:inviteId", cancelGameInvite);  // Hủy lời mời

// Xem lời mời
router.get("/received", getReceivedInvites);           // Lời mời đã nhận
router.get("/sent", getSentInvites);                   // Lời mời đã gửi

module.exports = router;
