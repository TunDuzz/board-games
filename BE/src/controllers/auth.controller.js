const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
console.log("Register called");

const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Kiểm tra user tồn tại
        // Kiểm tra user hoặc email tồn tại
        const existingUser = await User.findOne({
            where: {
                [require("sequelize").Op.or]: [{ email }, { username }]
            }
        });

        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(400).json({ message: "Email này đã được sử dụng!" });
            }
            if (existingUser.username === username) {
                return res.status(400).json({ message: "Tên người dùng đã tồn tại!" });
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
            elo: 1000
        });

        res.status(201).json({
            message: "Đăng ký thành công!",
            user: { id: newUser.user_id, username: newUser.username }
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Tìm user theo email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: "Email hoặc mật khẩu không đúng!" });
        }

        // Kiểm tra mật khẩu
        const validPass = await bcrypt.compare(password, user.password_hash);
        if (!validPass) {
            return res.status(400).json({ message: "Email hoặc mật khẩu không đúng!" });
        }

        // Tạo token
        const token = jwt.sign(
            { id: user.user_id, username: user.username },
            process.env.JWT_SECRET || "secretKey",
            { expiresIn: "24h" }
        );

        res.header("Authorization", token).json({
            message: "Đăng nhập thành công!",
            token,
            user: {
                id: user.user_id,
                username: user.username,
                email: user.email,
                rank: user.rank,
                elo: user.elo,
                avatar_url: user.avatar_url
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

module.exports = { register, login };
