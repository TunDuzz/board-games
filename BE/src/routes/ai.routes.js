const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.controller");
const verifyToken = require("../middleware/auth.middleware");

// Cung cấp API gợi ý nước đi qua OpenAI
router.post("/make-move", verifyToken, aiController.makeAiMove);

module.exports = router;
