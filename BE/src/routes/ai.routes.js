const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.controller");
const { verifyToken } = require("../middleware/auth.middleware");

router.post("/make-move", verifyToken, aiController.makeAiMove);
router.post("/analyze", verifyToken, aiController.analyzePosition);

module.exports = router;
