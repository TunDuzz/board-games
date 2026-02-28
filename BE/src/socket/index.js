const jwt = require("jsonwebtoken");
const { User, UserStats, MatchmakingQueue } = require("../models");
const matchmakingHandler = require("./matchmakingHandler");
const gameHandler = require("./gameHandler");

// Quản lý người dùng đang online { userId: socketId }
const onlineUsers = new Map();

module.exports = (io) => {
    // Middleware xác thực kết nối Socket.IO
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
            if (!token) {
                return next(new Error("Authentication error: No token provided"));
            }

            const cleanToken = token.replace("Bearer ", "");
            const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || "secretKey");

            // Lấy User kèm UserStats để có ELO
            const user = await User.findByPk(decoded.id, {
                include: [{ model: UserStats }]
            });
            if (!user) {
                return next(new Error("Authentication error: User not found"));
            }

            // Lưu user info vào socket session (ELO không có trực tiếp trên User, default 1000)
            socket.user = {
                id: user.user_id,
                username: user.username,
                elo: 1000 // ELO nằm ở bảng user_game_stats (theo từng game), dùng 1000 làm default
            };

            next();
        } catch (err) {
            console.log("[Socket] Auth Error:", err.message);
            next(new Error("Authentication error"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`[Socket] Connected: ${socket.user.username} (${socket.id})`);

        // Đăng ký user online
        onlineUsers.set(socket.user.id, socket.id);

        // Khởi tạo các event handler
        matchmakingHandler(io, socket, onlineUsers);
        gameHandler(io, socket, onlineUsers);

        // Xử lý khi ngắt kết nối: xóa khỏi matchmaking queue
        socket.on("disconnect", async () => {
            console.log(`[Socket] Disconnected: ${socket.user.username}`);
            onlineUsers.delete(socket.user.id);

            // Xóa khỏi hàng chờ matchmaking nếu đang tìm trận
            try {
                await MatchmakingQueue.destroy({ where: { user_id: socket.user.id } });
            } catch (err) {
                console.error("[Socket] Queue cleanup error:", err.message);
            }
        });
    });
};
