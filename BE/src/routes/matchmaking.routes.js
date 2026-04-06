const express = require("express");
const router = express.Router();
const matchmakingController = require("../controllers/matchmaking.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Cần xác thực user
router.use(verifyToken);

// ==========================
// ROUTES MATCHMAKING
// ==========================

// 1. Tham gia tìm trận
router.post("/join", async (req, res) => {
    try {
        const { gameTypeName } = req.body;
        const result = await matchmakingController.joinQueue({ userId: req.user.id, gameTypeName });
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi tìm trận!" });
    }
});

// 2. Polling trạng thái tìm trận
router.get("/status", async (req, res) => {
    try {
        const result = await matchmakingController.checkStatus({ userId: req.user.id });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi kiểm tra trạng thái!" });
    }
});

// 3. Hủy tìm trận
router.delete("/cancel", async (req, res) => {
    try {
        const result = await matchmakingController.cancelQueue({ userId: req.user.id });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi hủy tìm trận!" });
    }
});

module.exports = router;
