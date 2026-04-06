const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { verifyToken, requireAdmin } = require("../middleware/auth.middleware");

// Tất cả route trong đây đều cần là Admin
router.use(verifyToken, requireAdmin);

/**
 * GET /api/admin/users
 * Lấy danh sách tất cả người dùng
 */
router.get("/users", async (req, res) => {
    try {
        const users = await adminController.getAllUsers();
        return res.json(users);
    } catch (error) {
        console.error("[Admin GET Users Error]:", error);
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

/**
 * POST /api/admin/users/toggle-ban
 * Chặn/Bỏ chặn một người dùng
 */
router.post("/users/toggle-ban", async (req, res) => {
    try {
        const { userId } = req.body;
        const result = await adminController.toggleBanUser({ userId: parseInt(userId), adminId: req.user.id });
        return res.json(result);
    } catch (error) {
        console.error("[Admin Ban User Error]:", error);
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

module.exports = router;
