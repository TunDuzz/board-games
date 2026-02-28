const { User, Match, UserStats } = require("../models");

// Lấy thông tin cá nhân
const getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ["password_hash"] }, // Không trả về mật khẩu
            include: [
                { model: UserStats }
            ]
        });

        if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng!" });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

// Cập nhật thông tin (avatar, tên)
const updateProfile = async (req, res) => {
    try {
        const { full_name, avatar_url } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng!" });

        user.full_name = full_name || user.full_name;
        user.avatar_url = avatar_url || user.avatar_url;

        await user.save();

        res.json({ message: "Cập nhật thành công!", user });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

// Lấy lịch sử đấu
const getMatchHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        // Tìm các trận đấu mà user là player1 hoặc player2
        const matches = await Match.findAll({
            where: {
                [require("sequelize").Op.or]: [
                    { player1_id: userId },
                    { player2_id: userId }
                ]
            },
            order: [["end_time", "DESC"]], // Mới nhất trước
            limit: 20
        });

        res.json(matches);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

// Lấy bảng xếp hạng
const getRankings = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ["username", "full_name", "avatar_url", "elo", "rank"],
            include: [
                {
                    model: UserStats,
                    attributes: ["total_matches", "wins"]
                }
            ],
            order: [["elo", "DESC"]],
            limit: 50
        });

        // Calculate win rate manually if needed or just return raw stats
        const rankings = users.map(user => {
            const stats = user.UserStats || { total_matches: 0, wins: 0 };
            const winRate = stats.total_matches > 0
                ? Math.round((stats.wins / stats.total_matches) * 100) + "%"
                : "0%";

            return {
                username: user.username,
                displayName: user.full_name || user.username,
                avatarUrl: user.avatar_url,
                elo: user.elo,
                rankTitle: user.rank,
                totalGames: stats.total_matches,
                winRate: winRate
            };
        });

        res.json(rankings);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng!" });

        // Kiểm tra mật khẩu cũ
        const bcrypt = require("bcryptjs");
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: "Mật khẩu hiện tại không chính xác!" });
        }

        // Mã hóa mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: "Đổi mật khẩu thành công!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
};

module.exports = { getProfile, updateProfile, getMatchHistory, getRankings, changePassword };
