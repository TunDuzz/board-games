const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
console.log("Register called");

const register = async ({ username, email, password }) => {
    // Kiểm tra user hoặc email tồn tại
    const existingUser = await User.findOne({
        where: {
            [require("sequelize").Op.or]: [{ email }, { username }]
        }
    });

    if (existingUser) {
        if (existingUser.email === email) {
            const err = new Error("Email này đã được sử dụng!");
            err.statusCode = 400;
            throw err;
        }
        if (existingUser.username === username) {
            const err = new Error("Tên người dùng đã tồn tại!");
            err.statusCode = 400;
            throw err;
        }
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Tạo user mới
    const newUser = await User.create({
        username,
        email,
        password_hash,
        rank: "Bronze",
        elo: 0
    });

    return {
        message: "Đăng ký thành công!",
        user: { id: newUser.user_id, username: newUser.username }
    };
};

const login = async ({ email, password }) => {
    // Tìm user theo email
    const user = await User.findOne({ where: { email } });
    if (!user) {
        const err = new Error("Email hoặc mật khẩu không đúng!");
        err.statusCode = 400;
        throw err;
    }

    // Kiểm tra xem tài khoản có bị chặn không
    if (user.is_banned) {
        const err = new Error("Tài khoản của bạn đã bị khóa! Vui lòng liên hệ Admin.");
        err.statusCode = 403;
        throw err;
    }

    // Kiểm tra mật khẩu
    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
        const err = new Error("Email hoặc mật khẩu không đúng!");
        err.statusCode = 400;
        throw err;
    }

    // Tạo token
    const token = jwt.sign(
        { id: user.user_id, username: user.username, role: user.role },
        process.env.JWT_SECRET || "secretKey",
        { expiresIn: "24h" }
    );

    return {
        token,
        user: {
            id: user.user_id,
            username: user.username,
            email: user.email,
            rank: user.rank,
            elo: user.elo,
            avatar_url: user.avatar_url,
            role: user.role,
            is_banned: user.is_banned
        }
    };
};

module.exports = { register, login };
