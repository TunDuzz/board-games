const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/auth.controller");

// POST /api/auth/register
router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const result = await register({ username, email, password });
        return res.status(201).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await login({ email, password });
        return res.header("Authorization", result.token).json({ message: "Đăng nhập thành công!", ...result });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Lỗi server!" });
    }
});

module.exports = router;
