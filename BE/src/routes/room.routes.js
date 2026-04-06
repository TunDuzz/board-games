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
router.post("/create", async (req, res) => {
    try {
        const { gameTypeName, password, is_private } = req.body;
        const result = await roomController.createRoom({ userId: req.user.id, gameTypeName, password, is_private });
        return res.status(201).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server khi tạo phòng!" });
    }
});

// 2. Tham gia phòng cụ thể
router.post("/join", async (req, res) => {
    try {
        const { roomIdOrCode, password, gameTypeName } = req.body;
        const result = await roomController.joinRoom({ userId: req.user.id, roomIdOrCode, password, gameTypeName });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi Server khi Join Room!" });
    }
});

// 3. Tìm phòng nhanh
router.post("/quick-join", async (req, res) => {
    try {
        const { gameTypeName } = req.body;
        const result = await roomController.quickJoin({ userId: req.user.id, gameTypeName });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi Quick Join!" });
    }
});

// 4. Lấy danh sách phòng ĐANG CHỜ của một tựa game
router.get("/game/:gameTypeName", async (req, res) => {
    try {
        const { gameTypeName } = req.params;
        const result = await roomController.getRoomsByGameType({ gameTypeName });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi GET rooms!" });
    }
});

// 5. Xem danh sách các phòng mà user đang tham gia
router.get("/my-rooms", async (req, res) => {
    try {
        const result = await roomController.getMyRooms({ userId: req.user.id });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi GET My Rooms!" });
    }
});

module.exports = router;
