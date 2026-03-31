const express = require("express");
const router = express.Router();
const roomController = require("../controllers/room.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Yêu cầu xác thực tài khoản cho mọi route của Room
router.use(verifyToken);

// ==========================
// ROUTES CHO ROOM MANAGEMENT
// ==========================

// 1. Tạo phòng mới
router.post("/create", roomController.createRoom);

// 2. Tham gia phòng cụ thể (cần pass roomIdOrCode, password nếu có)
router.post("/join", roomController.joinRoom);

// 3. Tham gia phòng ngẫu nhiên (chỉ cần gửi loại game "gameTypeName")
router.post("/quick-join", roomController.quickJoin);

// 4. Lấy danh sách phòng ĐANG CHỜ của một tựa game (ví dụ: GET /api/rooms/game/chess)
router.get("/game/:gameTypeName", roomController.getRoomsByGameType);

// 5. Xem danh sách các phòng mà user đang tham gia
router.get("/my-rooms", roomController.getMyRooms);

module.exports = router;
