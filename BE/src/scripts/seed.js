const bcrypt = require("bcryptjs");
const { User } = require("../models");

/**
 * Khởi tạo tài khoản Admin mặc định nếu chưa tồn tại
 */
const seedAdmin = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || "admin@gmail.com";
        const adminUsername = process.env.ADMIN_USERNAME || "admin";
        const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

        // Kiểm tra xem đã có admin nào chưa
        const existingAdmin = await User.findOne({ 
            where: { role: "admin" } 
        });

        if (existingAdmin) {
            console.log(">>> [SEED] Tài khoản Admin đã tồn tại. Bỏ qua.");
            return;
        }

        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(adminPassword, salt);

        // Tạo Admin mới
        await User.create({
            username: adminUsername,
            email: adminEmail,
            password_hash,
            full_name: "System Administrator",
            role: "admin",
            is_active: true
        });

        console.log(">>> [SEED] Đã tạo tài khoản Admin mặc định thành công!");
        console.log(`>>> [SEED] Email: ${adminEmail} | Pass: ${adminPassword}`);
        
    } catch (error) {
        console.error(">>> [SEED] Lỗi khi tạo Admin:", error.message);
    }
};

module.exports = seedAdmin;
