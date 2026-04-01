const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedback.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Cả người dùng đã đăng nhập và khách đều có thể gửi góp ý
// Nếu có token, Controller sẽ tự động gán user_id
router.post("/", authMiddleware.optionalAuth, feedbackController.sendFeedback);

module.exports = router;
