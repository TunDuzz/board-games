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
router.post("/join", matchmakingController.joinQueue);

// 2. Polling trạng thái tìm trận
router.get("/status", matchmakingController.checkStatus);

// 3. Hủy tìm trận
router.delete("/cancel", matchmakingController.cancelQueue);

module.exports = router;
