const express = require("express");
const router = express.Router();
const { getProfile, updateProfile, getMatchHistory, getRankings, changePassword, getMatchMoves, uploadAvatar } = require("../controllers/user.controller");
const { verifyToken } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

// Tất cả các route này đều cần đăng nhập
router.use(verifyToken);

// GET /api/users/profile
router.get("/profile", async (req, res) => {
    try {
        const result = await getProfile({ userId: req.user.id });
        return res.json(result);
    } catch (error) {
        console.error("[Profile Error]:", error);
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// PUT /api/users/profile
router.put("/profile", async (req, res) => {
    try {
        const { full_name, avatar_url } = req.body;
        const result = await updateProfile({ userId: req.user.id, full_name, avatar_url });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// POST /api/user/upload-avatar
router.post("/upload-avatar", upload.single("avatar"), async (req, res) => {
    try {
        const result = await uploadAvatar({ userId: req.user.id, file: req.file });
        return res.json(result);
    } catch (error) {
        console.error("[Upload Avatar Error]:", error);
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi tải ảnh!" });
    }
});

// PUT /api/users/change-password
router.put("/change-password", async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const result = await changePassword({ userId: req.user.id, currentPassword, newPassword });
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// GET /api/users/history
router.get("/history", async (req, res) => {
    try {
        const result = await getMatchHistory({ userId: req.user.id, gameType: req.query.gameType });
        return res.json(result);
    } catch (error) {
        console.error("[Match History Error]:", error);
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// GET /api/users/rankings
router.get("/rankings", async (req, res) => {
    try {
        const result = await getRankings({ gameType: req.query.gameType });
        return res.json(result);
    } catch (error) {
        console.error("[Rankings Error]:", error);
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// GET /api/users/match/:matchId/moves
router.get("/match/:matchId/moves", async (req, res) => {
    try {
        const result = await getMatchMoves({ matchId: req.params.matchId });
        return res.json(result);
    } catch (error) {
        console.error("[Match Moves Error]:", error);
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

module.exports = router;
