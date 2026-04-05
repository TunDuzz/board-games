const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// POST /api/ai/make-move
router.post("/make-move", verifyToken, async (req, res) => {
  try {
    const { gameType, boardState, validMoves, botRole, difficulty } = req.body;
    const result = await aiController.makeAiMove({ gameType, boardState, validMoves, botRole, difficulty });
    return res.json(result);
  } catch (error) {
    console.error("[AI Move Error]:", error);
    return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi AI phát sinh" });
  }
});

// POST /api/ai/analyze
router.post("/analyze", verifyToken, async (req, res) => {
  try {
    const { gameType, boardState, turn, movesHistory } = req.body;
    const result = await aiController.analyzePosition({ gameType, boardState, turn, movesHistory });
    return res.json(result);
  } catch (error) {
    console.error("[Analyze Error]:", error);
    return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi phân tích" });
  }
});

module.exports = router;
