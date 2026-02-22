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
const verifyToken = require("../middleware/auth.middleware");

// Tất cả routes đều cần authentication
router.use(verifyToken);

// Quản lý bạn bè
router.get("/", getFriendsList);                    // Danh sách bạn bè
router.get("/pending", getPendingRequests);         // Lời mời đang chờ
router.get("/sent", getSentRequests);               // Lời mời đã gửi
router.get("/search", searchUsers);                 // Tìm kiếm người dùng

// Gửi và xử lý lời mời
router.post("/request/:userId", sendFriendRequest); // Gửi lời mời
router.post("/accept/:friendId", acceptFriendRequest); // Chấp nhận
router.post("/reject/:friendId", rejectFriendRequest); // Từ chối
router.delete("/remove/:friendId", removeFriend);   // Xóa bạn

// Chặn người dùng
router.post("/block/:userId", blockUser);           // Chặn
router.post("/unblock/:userId", unblockUser);       // Bỏ chặn

module.exports = router;
