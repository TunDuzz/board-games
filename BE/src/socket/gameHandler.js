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

            // Thầy cô và toàn phòng:
            const { User } = require("../models");
            const allPlayers = await RoomPlayer.findAll({
                where: { room_id: roomId },
                include: [{ model: User, attributes: ['user_id', 'username'] }]
            });

            let currentMatch = null;
            const liveRoom = await Room.findByPk(roomId);
            if (liveRoom && liveRoom.status === "playing") {
                currentMatch = await Match.findOne({ where: { room_id: roomId }, order: [['created_at', 'DESC']] });
            }

            socket.emit("game_room_joined", {
                message: `Đã kết nối vào phòng ${roomId}`,
                roomId,
                role: playerRecord.role,
                players: allPlayers.map(p => ({
                    userId: p.user_id,
                    username: p.User?.username || "Người chơi",
                    role: p.role
                })),
                match: currentMatch ? {
                    match_id: currentMatch.match_id,
                    currentTurn: roomTurnState.get(roomId)?.currentTurn
                } : null
            });

            // Tự động Khởi động trận đấu nếu là phòng Ghép trận (is_private === false)
            const room = await Room.findByPk(roomId);
            if (room && room.is_private === false && allPlayers.length === 2 && room.status === "waiting") {
                const player1 = allPlayers.find(p => p.role === "player1");
                const player2 = allPlayers.find(p => p.role === "player2");

                if (player1 && player2) {
                    await Room.update({ status: "playing" }, { where: { room_id: roomId } });

                    const match = await Match.create({
                        room_id: roomId,
                        game_type_id: room.game_type_id,
                        player1_id: player1.user_id,
                        player2_id: player2.user_id,
                        start_time: new Date()
                    });

                    roomTurnState.set(roomId, {
                        currentTurn: player1.user_id,
                        moveCount: 0,
                        player1Id: player1.user_id,
                        player2Id: player2.user_id,
                        moves_buffer: []
                    });

                    // Cần delay nhẹ 1 giây để cả 2 máy loading giao diện xong rồi dội Match_started mới chuẩn nhịp
                    setTimeout(() => {
                        io.to(roomKey).emit("match_started", {
                            match_id: match.match_id,
                            firstTurn: player1.user_id,
                            message: "Trận đấu bắt đầu!",
                            players: {
                                player1: { userId: player1.user_id, username: player1.User?.username || "Người chơi 1" },
                                player2: { userId: player2.user_id, username: player2.User?.username || "Người chơi 2" }
                            }
                        });
                    }, 1000);
                }
            }

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

            const { User } = require("../models");
            const room = await Room.findByPk(roomId, {
                include: [{ 
                    model: RoomPlayer,
                    include: [{ model: User, attributes: ['user_id', 'username'] }]
                }]
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
                player2Id: player2.user_id,
                moves_buffer: [] 
            });

            // Broadcast match_started đến cả phòng
            const roomKey = `game_room_${roomId}`;
            io.to(roomKey).emit("match_started", {
                match_id: match.match_id,
                firstTurn: player1.user_id,
                message: "Trận đấu bắt đầu!",
                players: {
                    player1: { userId: player1.user_id, username: player1.User?.username || "Người chơi 1" },
                    player2: { userId: player2.user_id, username: player2.User?.username || "Người chơi 2" }
                }
            });

        } catch (error) {
            console.error("[Game] start_match error:", error);
            socket.emit("game_error", { message: "Lỗi bắt đầu trận" });
        }
    });

    socket.on("set_time_limit", ({ roomId, minutes }) => {
        const roomKey = `game_room_${roomId}`;
        io.to(roomKey).emit("receive_time_limit", { minutes });
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

                // Broadcast lượt đi mới cho cả phòng
                io.to(roomKey).emit("turn_changed", {
                    currentTurn: nextTurn,
                    moveCount: turnState.moveCount
                });
            }

            // Thêm nước đi vào buffer RAM thay vì lưu thẳng DB
            if (turnState) {
                turnState.moves_buffer.push({
                    match_id: matchId,
                    player_id: userId,
                    move_data: typeof moveData === "string" ? moveData : JSON.stringify(moveData),
                    move_order: turnState.moveCount
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

            // Lưu các nước đi từ Buffer vào DB 1 lần duy nhất để tối ưu
            const turnState = roomTurnState.get(roomId);
            if (turnState && turnState.moves_buffer && turnState.moves_buffer.length > 0) {
                await Move.bulkCreate(turnState.moves_buffer);
            }

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

            if (turnState && turnState.moves_buffer && turnState.moves_buffer.length > 0) {
                await Move.bulkCreate(turnState.moves_buffer);
            }

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
    // CẦU HÒA (Offer Draw)
    // ===================================
    socket.on("offer_draw", ({ roomId }) => {
        const roomKey = `game_room_${roomId}`;
        socket.to(roomKey).emit("receive_draw_offer", {
            userId: socket.user.id,
            username: socket.user.username
        });
    });

    socket.on("accept_draw", async ({ roomId, matchId }) => {
        try {
            const roomKey = `game_room_${roomId}`;
            
            io.to(roomKey).emit("receive_game_over", {
                result: "draw",
                message: "Hai bên đã đồng ý hòa cờ!"
            });

            roomTurnState.delete(roomId);

            if (matchId) {
                await Match.update(
                    { result: "draw", winner_id: null, end_time: new Date() },
                    { where: { match_id: matchId } }
                );
            }
            await Room.update({ status: "ended" }, { where: { room_id: roomId } });

        } catch (error) {
            console.error("[Game] accept_draw error:", error);
        }
    });

    socket.on("reject_draw", ({ roomId }) => {
        const roomKey = `game_room_${roomId}`;
        socket.to(roomKey).emit("draw_rejected", {
            username: socket.user.username,
            message: "Đối thủ từ chối hòa cờ."
        });
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
    // RỜI PHÒNG (Leave Room / Thoát phòng)
    // ===================================
    socket.on("leave_room", async ({ roomId }) => {
        try {
            const userId = socket.user.id;
            const roomKey = `game_room_${roomId}`;
            const turnState = roomTurnState.get(roomId);

            const room = await Room.findByPk(roomId);
            if (!room) return;

            // 1. Nếu đang chơi (playing), rời đi coi như đầu hàng
            if (room.status === "playing") {
                let winnerId = null;
                if (turnState) {
                    winnerId = turnState.player1Id === userId ? turnState.player2Id : turnState.player1Id;
                }

                io.to(roomKey).emit("receive_game_over", {
                    result: "resign",
                    winnerId,
                    resignedBy: userId,
                    message: `${socket.user.username} đã rời phòng (Đầu hàng)!`
                });

                if (turnState && turnState.moves_buffer && turnState.moves_buffer.length > 0) {
                    const { Move } = require("../models");
                    await Move.bulkCreate(turnState.moves_buffer).catch(() => {});
                }

                roomTurnState.delete(roomId);

                const match = await Match.findOne({ where: { room_id: roomId }, order: [['match_id', 'DESC']] });
                if (match) {
                    await Match.update(
                        { result: "resign", winner_id: winnerId, end_time: new Date() },
                        { where: { match_id: match.match_id } }
                    );
                }

                await Room.update({ status: "ended" }, { where: { room_id: roomId } });
            }

            // 2. Xóa tư cách RoomPlayer
            await RoomPlayer.destroy({ where: { room_id: roomId, user_id: userId } });

            // 3. Thông báo cho người còn lại
            socket.to(roomKey).emit("player_left", {
                userId,
                username: socket.user.username,
                message: `${socket.user.username} đã thoát khỏi phòng.`
            });

            // 4. Nếu phòng không còn ai, kết thúc hẳn
            const leftover = await RoomPlayer.count({ where: { room_id: roomId } });
            if (leftover === 0) {
                await Room.update({ status: "ended" }, { where: { room_id: roomId } });
            }

            // Thoát socket.join
            socket.leave(roomKey);
            delete socket.currentRoomId;

        } catch (error) {
            console.error("[Game] leave_room error:", error);
        }
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
