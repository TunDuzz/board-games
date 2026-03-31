const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const token = req.header("Authorization");

    if (!token) {
        return res.status(401).json({ message: "Truy cập bị từ chối! Vui lòng đăng nhập." });
    }

    try {
        const verified = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET || "secretKey");
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: "Token không hợp lệ!" });
    }
};

const optionalAuth = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) {
        return next();
    }
    try {
        const verified = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET || "secretKey");
        req.user = verified;
        next();
    } catch (err) {
        // Skip error for optional auth
        next();
    }
};

module.exports = {verifyToken, optionalAuth};
