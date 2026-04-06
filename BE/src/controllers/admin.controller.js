const { User } = require("../models");

/**
 * Lấy toàn bộ danh sách người dùng
 */
exports.getAllUsers = async () => {
    const users = await User.findAll({
        attributes: { exclude: ["password_hash"] },
        order: [["created_at", "DESC"]]
    });
    return users;
};

/**
 * Chặn hoặc bỏ chặn người dùng
 */
exports.toggleBanUser = async ({ userId, adminId }) => {
    if (userId === adminId) {
        const err = new Error("Admin không thể tự chặn chính mình!");
        err.statusCode = 400;
        throw err;
    }

    const user = await User.findByPk(userId);
    if (!user) {
        const err = new Error("Không tìm thấy người dùng!");
        err.statusCode = 404;
        throw err;
    }

    user.is_banned = !user.is_banned;
    await user.save();

    return {
        message: user.is_banned ? "Đã chặn người dùng thành công!" : "Đã bỏ chặn người dùng thành công!",
        user: {
            user_id: user.user_id,
            username: user.username,
            is_banned: user.is_banned
        }
    };
};
