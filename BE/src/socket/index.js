const jwt = require("jsonwebtoken");
const { User, UserStats, MatchmakingQueue, Friend } = require("../models");
const matchmakingHandler = require("./matchmakingHandler");
const gameHandler = require("./gameHandler");

// Quản lý người dùng đang online { userId: socketId }
const onlineUsers = new Map();
// Quản lý người dùng đang trong trận { userId: roomId }
const inGameUsers = new Map();

module.exports = (io) => {
    // Helper function để gửi thông báo trạng thái tới bạn bè
    const broadcastStatusToFriends = async (userId, username, status) => {
        try {
            const friends = await Friend.findAll({
                where: { user_id: userId, status: "accepted" },
                attributes: ['friend_id']
            });

            friends.forEach(f => {
                const friendSocketId = onlineUsers.get(f.friend_id);
                if (friendSocketId) {
                    io.to(friendSocketId).emit("friend_status_changed", {
                        userId: userId,
                        username: username,
                        status: status // "online", "offline", "in_game"
                    });
                }
            });
        } catch (err) {
            console.error("[Socket] Broadcast status error:", err.message);
        }
    };

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

            // Lưu user info vào socket session
            socket.user = {
                id: user.user_id,
                username: user.username,
                elo: user.UserStat ? user.UserStat.elo : 0 
            };

            next();
        } catch (err) {
            console.log("[Socket] Auth Error:", err.message);
            next(new Error("Authentication error"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`[Socket] Connected: ${socket.user.username} (${socket.id})`);

        onlineUsers.set(socket.user.id, socket.id);
        broadcastStatusToFriends(socket.user.id, socket.user.username, "online");

        matchmakingHandler(io, socket, onlineUsers);
        gameHandler(io, socket, onlineUsers, inGameUsers, broadcastStatusToFriends);

        socket.on("disconnect", async () => {
            console.log(`[Socket] Disconnected: ${socket.user.username}`);
            onlineUsers.delete(socket.user.id);
            inGameUsers.delete(socket.user.id);
            broadcastStatusToFriends(socket.user.id, socket.user.username, "offline");

            try {
                await MatchmakingQueue.destroy({ where: { user_id: socket.user.id } });
            } catch (err) {
                console.error("[Socket] Queue cleanup error:", err.message);
            }
        });
    });

    return { onlineUsers, inGameUsers };
};
