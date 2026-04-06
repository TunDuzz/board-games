const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedback.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Cả người dùng đã đăng nhập và khách đều có thể gửi góp ý
// Nếu có token, Controller sẽ tự động gán user_id
router.post("/", authMiddleware.optionalAuth, async (req, res) => {
  try {
    const { subject, content } = req.body;
    const userId = req.user ? req.user.id : null;
    const result = await feedbackController.sendFeedback({ subject, content, userId });
    return res.status(201).json(result);
  } catch (error) {
    console.error("Lỗi gửi góp ý:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Đã có lỗi xảy ra khi gửi góp ý.",
    });
  }
});

module.exports = router;
