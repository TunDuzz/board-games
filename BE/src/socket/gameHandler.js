const { Room, RoomPlayer, Match, Move } = require("../models");

// Lưu trạng thái lượt đi của từng phòng trong bộ nhớ (Node.js memory)
// Interface: { roomId: { currentTurn: userId, moveCount: 0, player1Id, player2Id } }
const roomTurnState = new Map();

module.exports = (io, socket, onlineUsers) => {

    // ===================================
    // JOIN VÀO PHÒNG SOCKET
    // ===================================
    socket.on("join_game_room", async ({ roomId }) => {
        try {
            const userId = socket.user.id;

            // Xác minh User là thành viên hợp lệ
            const playerRecord = await RoomPlayer.findOne({
                where: { room_id: roomId, user_id: userId }
            });

            if (!playerRecord) {
                return socket.emit("game_error", { message: "Bạn không phải thành viên của phòng này" });
            }

            // Join vào Socket.IO Room
            const roomKey = `game_room_${roomId}`;
            socket.join(roomKey);

            // Lưu trạng thái phòng vào socket để dùng khi disconnect
            socket.currentRoomId = roomId;
            socket.currentRole = playerRecord.role;

            // Thông báo cho người còn lại trong phòng
            socket.to(roomKey).emit("player_joined", {
                userId,
                username: socket.user.username,
                role: playerRecord.role
            });

            socket.emit("game_room_joined", {
                message: `Đã kết nối vào phòng ${roomId}`,
                roomId,
                role: playerRecord.role
            });

        } catch (error) {
            console.error("[Game] join_game_room error:", error);
            socket.emit("game_error", { message: "Lỗi kết nối vào phòng" });
        }
    });

    // ===================================
    // BẮT ĐẦU TRẬN ĐẤU (Khi cả 2 đã vào phòng)
    // ===================================
    // Ý nghĩa: Event này tạo bản ghi Match trong DB và khai báo ai đi trước.
    // Host / player1 gửi event này sau khi cả 2 đã sẵn sàng.
    socket.on("start_match", async ({ roomId }) => {
        try {
            const userId = socket.user.id;

            const room = await Room.findByPk(roomId, {
                include: [{ model: RoomPlayer }]
            });

            if (!room) return socket.emit("game_error", { message: "Không tìm thấy phòng" });
            if (room.host_id !== userId) return socket.emit("game_error", { message: "Chỉ host mới bắt đầu được" });
            if (room.RoomPlayers.length < 2) return socket.emit("game_error", { message: "Cần đủ 2 người chơi" });

            const player1 = room.RoomPlayers.find(p => p.role === "player1");
            const player2 = room.RoomPlayers.find(p => p.role === "player2");

            if (!player1 || !player2) return socket.emit("game_error", { message: "Thiếu người chơi" });

            // Chuyển phòng sang trạng thái playing
            await Room.update({ status: "playing" }, { where: { room_id: roomId } });

            // Tạo bản ghi Match trong DB
            const match = await Match.create({
                room_id: roomId,
                game_type_id: room.game_type_id,
                player1_id: player1.user_id,
                player2_id: player2.user_id,
                start_time: new Date()
            });

            // Khởi tạo trạng thái lượt đi trong memory (player1 đi trước)
            roomTurnState.set(roomId, {
                currentTurn: player1.user_id,
                moveCount: 0,
                player1Id: player1.user_id,
                player2Id: player2.user_id
            });

            // Broadcast match_started đến cả phòng
            const roomKey = `game_room_${roomId}`;
            io.to(roomKey).emit("match_started", {
                match_id: match.match_id,
                firstTurn: player1.user_id,
                message: "Trận đấu bắt đầu!"
            });

        } catch (error) {
            console.error("[Game] start_match error:", error);
            socket.emit("game_error", { message: "Lỗi bắt đầu trận" });
        }
    });

    // ===================================
    // ĐÁNH CỜ / ĐỒNG BỘ NƯỚC ĐI
    // ===================================
    socket.on("make_move", async ({ roomId, matchId, moveData, moveOrder }) => {
        try {
            const userId = socket.user.id;
            const roomKey = `game_room_${roomId}`;

            // Kiểm tra lượt đi (chặn đánh sai lượt)
            const turnState = roomTurnState.get(roomId);
            if (turnState && turnState.currentTurn !== userId) {
                return socket.emit("game_error", { message: "Không phải lượt của bạn!" });
            }

            // Broadcast nước đi tới đối thủ ngay lập tức (real-time, không chờ DB)
            socket.to(roomKey).emit("receive_move", {
                userId,
                moveData,
                moveOrder: turnState ? turnState.moveCount + 1 : moveOrder
            });

            // Chuyển lượt sang người kia
            if (turnState) {
                const nextTurn = turnState.currentTurn === turnState.player1Id
                    ? turnState.player2Id
                    : turnState.player1Id;
                turnState.currentTurn = nextTurn;
                turnState.moveCount++;
            }

            // Lưu nước đi vào DB để có thể replay sau
            if (matchId) {
                await Move.create({
                    match_id: matchId,
                    player_id: userId,
                    move_data: typeof moveData === "string" ? moveData : JSON.stringify(moveData),
                    move_order: turnState ? turnState.moveCount : moveOrder
                });
            }

        } catch (error) {
            console.error("[Game] make_move error:", error);
            socket.emit("game_error", { message: "Lỗi xử lý nước đi" });
        }
    });

    // ===================================
    // KẾT THÚC TRẬN ĐẤU (Game Over)
    // ===================================
    socket.on("game_over", async ({ roomId, matchId, result, winnerId }) => {
        try {
            const roomKey = `game_room_${roomId}`;

            // Broadcast kết quả cho cả phòng
            io.to(roomKey).emit("receive_game_over", {
                result,        // "win", "draw", "resign", "timeout"
                winnerId,
                message: winnerId ? `Người thắng: ${winnerId}` : "Hòa cờ!"
            });

            // Xóa state lượt đi
            roomTurnState.delete(roomId);

            // Lưu kết quả trận vào DB
            if (matchId) {
                await Match.update(
                    { result, winner_id: winnerId || null, end_time: new Date() },
                    { where: { match_id: matchId } }
                );
            }

            // Đóng phòng
            await Room.update({ status: "ended" }, { where: { room_id: roomId } });

        } catch (error) {
            console.error("[Game] game_over error:", error);
        }
    });

    // ===================================
    // ĐẦU HÀNG (Resign)
    // ===================================
    socket.on("resign", async ({ roomId, matchId }) => {
        try {
            const userId = socket.user.id;
            const roomKey = `game_room_${roomId}`;
            const turnState = roomTurnState.get(roomId);

            // Người còn lại là người thắng
            let winnerId = null;
            if (turnState) {
                winnerId = turnState.player1Id === userId ? turnState.player2Id : turnState.player1Id;
            }

            io.to(roomKey).emit("receive_game_over", {
                result: "resign",
                winnerId,
                resignedBy: userId,
                message: `${socket.user.username} đã đầu hàng!`
            });

            roomTurnState.delete(roomId);

            if (matchId) {
                await Match.update(
                    { result: "resign", winner_id: winnerId, end_time: new Date() },
                    { where: { match_id: matchId } }
                );
            }
            await Room.update({ status: "ended" }, { where: { room_id: roomId } });

        } catch (error) {
            console.error("[Game] resign error:", error);
        }
    });

    // ===================================
    // CHAT TRONG PHÒNG
    // ===================================
    socket.on("send_room_message", ({ roomId, text }) => {
        const roomKey = `game_room_${roomId}`;
        io.to(roomKey).emit("receive_room_message", {
            userId: socket.user.id,
            username: socket.user.username,
            text,
            timestamp: new Date()
        });
    });

    // ===================================
    // XỬ LÝ NGẮT KẾT NỐI KHI ĐANG CHƠI
    // ===================================
    socket.on("disconnect", () => {
        const roomId = socket.currentRoomId;
        if (roomId) {
            const roomKey = `game_room_${roomId}`;
            socket.to(roomKey).emit("opponent_disconnected", {
                userId: socket.user.id,
                username: socket.user.username,
                message: `${socket.user.username} mất kết nối! Đang chờ kết nối lại...`
            });
        }
    });
};
