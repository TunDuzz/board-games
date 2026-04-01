const { Room, RoomPlayer, Match, Move, Chat, UserGameStats, UserStats, User } = require("../models");
const eloService = require("../utils/elo.service");

// Lưu trạng thái lượt đi của từng phòng trong bộ nhớ (Node.js memory)
const roomTurnState = new Map();

/**
 * Helper function to update all relevant statistics
 * centralizes Elo calculation and Win/Loss/Draw updates for both total and per-game stats
 */
const updateGameStats = async (match, winnerId, result, details) => {
    try {
        const { player1_id, player2_id, game_type_id } = match;
        const { isRanked, isPrivate } = details || {};

        // 1. Lấy/Tạo bản ghi UserGameStats (thống kê riêng từng game)
        const [p1GameStats] = await UserGameStats.findOrCreate({
            where: { user_id: player1_id, game_type_id },
            defaults: { elo: 100, matches: 0, wins: 0, losses: 0, draws: 0 }
        });
        const [p2GameStats] = await UserGameStats.findOrCreate({
            where: { user_id: player2_id, game_type_id },
            defaults: { elo: 100, matches: 0, wins: 0, losses: 0, draws: 0 }
        });

        // 2. Định nghĩa kết quả cho từng người chơi
        let p1Outcome = "lose";
        let p2Outcome = "lose";

        if (result === "draw" || !winnerId) {
            p1Outcome = "draw";
            p2Outcome = "draw";
        } else if (winnerId === player1_id) {
            p1Outcome = "win";
            p2Outcome = "lose";
        } else if (winnerId === player2_id) {
            p1Outcome = "lose";
            p2Outcome = "win";
        }

        // 3. Tính toán ELO change
        const p1EloChange = eloService.calculateEloChange(
            p1GameStats.elo || 0,
            p2GameStats.elo || 0,
            p1Outcome,
            { isRanked, isPrivate }
        );

        const p2EloChange = eloService.calculateEloChange(
            p2GameStats.elo || 0,
            p1GameStats.elo || 0,
            p2Outcome,
            { isRanked, isPrivate }
        );

        // 4. Cập nhật UserGameStats
        const p1NewElo = Math.max(0, (p1GameStats.elo || 0) + p1EloChange);
        const p2NewElo = Math.max(0, (p2GameStats.elo || 0) + p2EloChange);

        await p1GameStats.update({
            elo: p1NewElo,
            matches: (p1GameStats.matches || 0) + 1,
            wins: (p1GameStats.wins || 0) + (p1Outcome === "win" ? 1 : 0),
            losses: (p1GameStats.losses || 0) + (p1Outcome === "lose" ? 1 : 0),
            draws: (p1GameStats.draws || 0) + (p1Outcome === "draw" ? 1 : 0)
        });

        await p2GameStats.update({
            elo: p2NewElo,
            matches: (p2GameStats.matches || 0) + 1,
            wins: (p2GameStats.wins || 0) + (p2Outcome === "win" ? 1 : 0),
            losses: (p2GameStats.losses || 0) + (p2Outcome === "lose" ? 1 : 0),
            draws: (p2GameStats.draws || 0) + (p2Outcome === "draw" ? 1 : 0)
        });

        // 5. Cập nhật tổng UserStats
        const [u1Total] = await UserStats.findOrCreate({ 
            where: { user_id: player1_id },
            defaults: { total_matches: 0, wins: 0, losses: 0, draws: 0 }
        });
        const [u2Total] = await UserStats.findOrCreate({ 
            where: { user_id: player2_id },
            defaults: { total_matches: 0, wins: 0, losses: 0, draws: 0 }
        });

        await u1Total.update({
            total_matches: (u1Total.total_matches || 0) + 1,
            wins: (u1Total.wins || 0) + (p1Outcome === "win" ? 1 : 0),
            losses: (u1Total.losses || 0) + (p1Outcome === "lose" ? 1 : 0),
            draws: (u1Total.draws || 0) + (p1Outcome === "draw" ? 1 : 0)
        });

        await u2Total.update({
            total_matches: (u2Total.total_matches || 0) + 1,
            wins: (u2Total.wins || 0) + (p2Outcome === "win" ? 1 : 0),
            losses: (u2Total.losses || 0) + (p2Outcome === "lose" ? 1 : 0),
            draws: (u2Total.draws || 0) + (p2Outcome === "draw" ? 1 : 0)
        });

        return { p1EloChange, p2EloChange, p1NewElo, p2NewElo };
    } catch (err) {
        console.error("[Stats Update Error]:", err);
        return null;
    }
};

module.exports = (io, socket, onlineUsers, inGameUsers, broadcastStatusToFriends) => {

    // ===================================
    // JOIN PHÒNG
    // ===================================
    socket.on("join_game_room", async ({ roomId }) => {
        try {
            const userId = socket.user.id;
            const rid = Number(roomId);

            inGameUsers.set(userId, rid);
            broadcastStatusToFriends(userId, socket.user.username, "in_game");

            const playerRecord = await RoomPlayer.findOne({
                where: { room_id: rid, user_id: userId }
            });

            if (!playerRecord) {
                return socket.emit("game_error", { message: "Bạn không phải thành viên của phòng này" });
            }

            const roomKey = `game_room_${rid}`;
            socket.join(roomKey);
            socket.currentRoomId = rid;
            socket.currentRole = playerRecord.role;

            socket.to(roomKey).emit("player_joined", {
                userId,
                username: socket.user.username,
                role: playerRecord.role
            });

            const allPlayers = await RoomPlayer.findAll({
                where: { room_id: rid },
                include: [{ model: User, attributes: ['user_id', 'username'] }]
            });

            const liveRoom = await Room.findByPk(rid);
            let currentMatch = null;
            let moves = [];
            
            if (liveRoom && liveRoom.status === "playing") {
                currentMatch = await Match.findOne({ 
                    where: { room_id: rid }, 
                    order: [['start_time', 'DESC']] 
                });

                if (currentMatch) {
                    const savedMoves = await Move.findAll({
                        where: { match_id: currentMatch.match_id },
                        order: [['move_order', 'ASC']]
                    });
                    
                    moves = savedMoves.map(m => ({
                        ...m.toJSON(),
                        move_data: typeof m.move_data === "string" ? JSON.parse(m.move_data) : m.move_data
                    }));

                    if (!roomTurnState.has(rid)) {
                        const p1 = allPlayers.find(p => p.role === "player1");
                        const p2 = allPlayers.find(p => p.role === "player2");
                        const nextTurnUserId = (moves.length % 2 === 0) ? p1?.user_id : p2?.user_id;

                        roomTurnState.set(rid, {
                            currentTurn: nextTurnUserId || p1?.user_id,
                            moveCount: moves.length,
                            player1Id: p1?.user_id,
                            player2Id: p2?.user_id,
                            player1Time: liveRoom.time_limit ? liveRoom.time_limit * 60 : 1800,
                            player2Time: liveRoom.time_limit ? liveRoom.time_limit * 60 : 1800,
                            turnStartTime: new Date(),
                            moves_buffer: []
                        });
                    } else {
                        const buffer = roomTurnState.get(rid).moves_buffer || [];
                        moves = [...moves, ...buffer];
                    }
                }
            }

            const chatHistory = await Chat.findAll({
                where: { room_id: rid },
                order: [['created_at', 'ASC']],
                limit: 30,
                include: [{ model: User, attributes: ['username', 'avatar_url'] }]
            });

            const playerStats = await Promise.all(allPlayers.map(async p => {
                const stat = await UserGameStats.findOne({
                    where: { user_id: p.user_id, game_type_id: liveRoom.game_type_id }
                });
                const elo = stat ? stat.elo : 100;
                const rankData = eloService.getRank(elo);
                
                return {
                    userId: p.user_id,
                    username: p.User?.username || "Người chơi",
                    role: p.role,
                    elo: elo,
                    rank: rankData.name
                };
            }));

            socket.emit("game_room_joined", {
                roomId: rid,
                role: playerRecord.role,
                players: playerStats,
                chatHistory: chatHistory.map(c => ({
                    userId: c.user_id,
                    username: c.User?.username || "Ẩn danh",
                    avatar: c.User?.avatar_url || "/default-avatar.png",
                    text: c.message,
                    timestamp: c.created_at
                })),
                match: currentMatch ? (() => {
                    const state = roomTurnState.get(rid);
                    if (!state) return null;
                    const now = new Date();
                    const secondsElapsed = Math.floor((now - state.turnStartTime) / 1000);
                    let p1Time = state.player1Time;
                    let p2Time = state.player2Time;

                    if (state.currentTurn === state.player1Id) p1Time = Math.max(0, p1Time - secondsElapsed);
                    else if (state.currentTurn === state.player2Id) p2Time = Math.max(0, p2Time - secondsElapsed);

                    return {
                        match_id: currentMatch.match_id,
                        currentTurn: state.currentTurn,
                        moves: moves,
                        player1Time: p1Time,
                        player2Time: p2Time
                    };
                })() : null
            });

        } catch (error) {
            console.error("[Game] join error:", error);
            socket.emit("game_error", { message: "Lỗi kết nối phòng" });
        }
    });

    // ===================================
    // BẮT ĐẦU TRẬN ĐẤU
    // ===================================
    socket.on("start_match", async ({ roomId }) => {
        try {
            const userId = socket.user.id;
            const room = await Room.findByPk(roomId, {
                include: [{ model: RoomPlayer, include: [{ model: User, attributes: ['user_id', 'username'] }] }]
            });

            if (!room || room.host_id !== userId || room.RoomPlayers.length < 2) return;

            const p1 = room.RoomPlayers.find(p => p.role === "player1");
            const p2 = room.RoomPlayers.find(p => p.role === "player2");

            await Room.update({ status: "playing" }, { where: { room_id: roomId } });

            const match = await Match.create({
                room_id: roomId,
                game_type_id: room.game_type_id,
                player1_id: p1.user_id,
                player2_id: p2.user_id,
                start_time: new Date()
            });

            roomTurnState.set(Number(roomId), {
                currentTurn: p1.user_id,
                moveCount: 0,
                player1Id: p1.user_id,
                player2Id: p2.user_id,
                player1Time: room.time_limit ? room.time_limit * 60 : 1800,
                player2Time: room.time_limit ? room.time_limit * 60 : 1800,
                turnStartTime: new Date(),
                moves_buffer: [] 
            });

            io.to(`game_room_${roomId}`).emit("match_started", {
                match_id: match.match_id,
                firstTurn: p1.user_id,
                players: {
                    player1: { userId: p1.user_id, username: p1.User?.username || "P1" },
                    player2: { userId: p2.user_id, username: p2.User?.username || "P2" }
                }
            });
        } catch (error) {
            console.error("[Game] start error:", error);
        }
    });

    // ===================================
    // ĐÁNH CỜ
    // ===================================
    socket.on("make_move", async ({ roomId, matchId, moveData, moveOrder, remainingTime }) => {
        try {
            const userId = socket.user.id;
            const turnState = roomTurnState.get(Number(roomId));
            if (turnState && turnState.currentTurn !== userId) return;

            socket.to(`game_room_${roomId}`).emit("receive_move", {
                userId,
                moveData,
                moveOrder: turnState ? turnState.moveCount + 1 : moveOrder
            });

            if (turnState) {
                if (userId === turnState.player1Id) turnState.player1Time = remainingTime;
                else turnState.player2Time = remainingTime;

                const nextTurn = turnState.currentTurn === turnState.player1Id ? turnState.player2Id : turnState.player1Id;
                turnState.currentTurn = nextTurn;
                turnState.moveCount++;
                turnState.turnStartTime = new Date();

                io.to(`game_room_${roomId}`).emit("turn_changed", {
                    currentTurn: nextTurn,
                    moveCount: turnState.moveCount,
                    player1Time: turnState.player1Time,
                    player2Time: turnState.player2Time
                });

                turnState.moves_buffer.push({
                    match_id: matchId,
                    player_id: userId,
                    move_data: typeof moveData === "string" ? moveData : JSON.stringify(moveData),
                    move_order: turnState.moveCount
                });
                
                // Lưu DB mỗi 5 nước để an toàn
                if (turnState.moves_buffer.length >= 5) {
                    await Move.bulkCreate(turnState.moves_buffer).catch(console.error);
                    turnState.moves_buffer = [];
                }
            }
        } catch (error) {
            console.error("[Game] move error:", error);
        }
    });

    // ===================================
    // KẾT THÚC (Thỏa thuận / Kết quả bàn cờ)
    // ===================================
    socket.on("game_over", async (data) => {
        try {
            const { roomId, matchId, result, winnerId } = data;
            const roomKey = `game_room_${roomId}`;

            const turnState = roomTurnState.get(Number(roomId));
            if (turnState?.moves_buffer?.length > 0) {
                await Move.bulkCreate(turnState.moves_buffer).catch(console.error);
            }

            if (matchId && roomId) {
                const liveRoom = await Room.findByPk(roomId);
                const match = await Match.findByPk(matchId);
                
                if (liveRoom && match) {
                    const stats = await updateGameStats(match, winnerId, result, {
                        isRanked: !liveRoom.is_private,
                        isPrivate: liveRoom.is_private
                    });

                    await match.update({
                        result,
                        winner_id: winnerId || null,
                        end_time: new Date()
                    });

                    io.to(roomKey).emit("receive_game_over", { result, winnerId });
                    if (stats) {
                        io.to(roomKey).emit("elo_updated", {
                            p1: { userId: match.player1_id, eloChange: stats.p1EloChange, newElo: stats.p1NewElo },
                            p2: { userId: match.player2_id, eloChange: stats.p2EloChange, newElo: stats.p2NewElo }
                        });
                    }
                }
            }
            roomTurnState.delete(Number(roomId));
            await Room.update({ status: "ended" }, { where: { room_id: roomId } });
        } catch (error) {
            console.error("[Game] game_over error:", error);
        }
    });

    // ===================================
    // ĐẦU HÀNG
    // ===================================
    socket.on("resign", async (data) => {
        try {
            const { roomId, matchId } = data;
            const userId = socket.user.id;
            const turnState = roomTurnState.get(Number(roomId));
            const winnerId = turnState ? (turnState.player1Id === userId ? turnState.player2Id : turnState.player1Id) : null;

            if (turnState?.moves_buffer?.length > 0) {
                await Move.bulkCreate(turnState.moves_buffer).catch(console.error);
            }

            if (matchId && roomId && winnerId) {
                const liveRoom = await Room.findByPk(roomId);
                const match = await Match.findByPk(matchId);
                if (liveRoom && match) {
                    const stats = await updateGameStats(match, winnerId, "resign", {
                        isRanked: !liveRoom.is_private,
                        isPrivate: liveRoom.is_private,
                    });

                    await match.update({ result: "resign", winner_id: winnerId, end_time: new Date() });
                    
                    io.to(`game_room_${roomId}`).emit("receive_game_over", { result: "resign", winnerId, resignedBy: userId });
                    if (stats) {
                        io.to(`game_room_${roomId}`).emit("elo_updated", {
                            p1: { userId: match.player1_id, eloChange: stats.p1EloChange, newElo: stats.p1NewElo },
                            p2: { userId: match.player2_id, eloChange: stats.p2EloChange, newElo: stats.p2NewElo }
                        });
                    }
                }
            }
            roomTurnState.delete(Number(roomId));
            await Room.update({ status: "ended" }, { where: { room_id: roomId } });
        } catch (error) {
            console.error("[Game] resign error:", error);
        }
    });

    // ===================================
    // HÒA CỜ
    // ===================================
    socket.on("offer_draw", ({ roomId }) => {
        socket.to(`game_room_${roomId}`).emit("receive_draw_offer", { userId: socket.user.id, username: socket.user.username });
    });

    socket.on("accept_draw", async (data) => {
        try {
            const { roomId, matchId } = data;
            const turnState = roomTurnState.get(Number(roomId));

            if (turnState?.moves_buffer?.length > 0) {
                await Move.bulkCreate(turnState.moves_buffer).catch(console.error);
            }

            if (matchId && roomId) {
                const liveRoom = await Room.findByPk(roomId);
                const match = await Match.findByPk(matchId);
                if (liveRoom && match) {
                    const stats = await updateGameStats(match, null, "draw", {
                        isRanked: !liveRoom.is_private,
                        isPrivate: liveRoom.is_private,
                    });

                    await match.update({ result: "draw", winner_id: null, end_time: new Date() });
                    
                    io.to(`game_room_${roomId}`).emit("receive_game_over", { result: "draw" });
                    if (stats) {
                        io.to(`game_room_${roomId}`).emit("elo_updated", {
                            p1: { userId: match.player1_id, eloChange: stats.p1EloChange, newElo: stats.p1NewElo },
                            p2: { userId: match.player2_id, eloChange: stats.p2EloChange, newElo: stats.p2NewElo }
                        });
                    }
                }
            }
            roomTurnState.delete(Number(roomId));
            await Room.update({ status: "ended" }, { where: { room_id: roomId } });
        } catch (error) {
            console.error("[Game] accept_draw error:", error);
        }
    });

    socket.on("reject_draw", ({ roomId }) => {
        socket.to(`game_room_${roomId}`).emit("draw_rejected", { username: socket.user.username });
    });

    // ===================================
    // RỜI PHÒNG
    // ===================================
    socket.on("leave_room", async ({ roomId }) => {
        try {
            const userId = socket.user.id;
            const room = await Room.findByPk(roomId);
            if (!room) return;

            if (room.status === "playing") {
                const turnState = roomTurnState.get(Number(roomId));
                const winnerId = turnState ? (turnState.player1Id === userId ? turnState.player2Id : turnState.player1Id) : null;
                const match = await Match.findOne({ where: { room_id: roomId }, order: [['match_id', 'DESC']] });
                
                if (match && winnerId) {
                    const stats = await updateGameStats(match, winnerId, "resign", {
                        isRanked: !room.is_private,
                        isPrivate: room.is_private,
                    });

                    await match.update({ result: "resign", winner_id: winnerId, end_time: new Date() });
                    
                    io.to(`game_room_${roomId}`).emit("receive_game_over", { result: "resign", winnerId, resignedBy: userId, message: "Đối thủ rời phòng!" });
                    if (stats) {
                        io.to(`game_room_${roomId}`).emit("elo_updated", {
                            p1: { userId: match.player1_id, eloChange: stats.p1EloChange, newElo: stats.p1NewElo },
                            p2: { userId: match.player2_id, eloChange: stats.p2EloChange, newElo: stats.p2NewElo }
                        });
                    }
                }
                roomTurnState.delete(Number(roomId));
                await Room.update({ status: "ended" }, { where: { room_id: roomId } });
            }

            await RoomPlayer.destroy({ where: { room_id: roomId, user_id: userId } });
            socket.to(`game_room_${roomId}`).emit("player_left", { userId, username: socket.user.username });
            
            const leftover = await RoomPlayer.count({ where: { room_id: roomId } });
            if (leftover === 0) await Room.update({ status: "ended" }, { where: { room_id: roomId } });

            socket.leave(`game_room_${roomId}`);
            inGameUsers.delete(userId);
            broadcastStatusToFriends(userId, socket.user.username, "online");
        } catch (error) {
            console.error("[Game] leave error:", error);
        }
    });

    // ===================================
    // CHAT
    // ===================================
    socket.on("send_room_message", async ({ roomId, text }) => {
        try {
            await Chat.create({ room_id: roomId, user_id: socket.user.id, message: text });
            io.to(`game_room_${roomId}`).emit("receive_room_message", {
                userId: socket.user.id,
                username: socket.user.username,
                avatar: socket.user.avatar_url || "/default-avatar.png",
                text,
                timestamp: new Date()
            });
        } catch (e) { console.error(e); }
    });

    // ===================================
    // ĐI LẠI (Undo / Takeback)
    // ===================================
    socket.on("request_undo", ({ roomId }) => {
        const roomKey = `game_room_${roomId}`;
        socket.to(roomKey).emit("undo_request_received", {
            userId: socket.user.id,
            username: socket.user.username
        });
    });

    socket.on("accept_undo", async ({ roomId, matchId }) => {
        try {
            const roomKey = `game_room_${roomId}`;
            const turnState = roomTurnState.get(roomId);

            if (turnState && turnState.moveCount > 0) {
                // 1. Lùi moveCount
                turnState.moveCount--;
                
                // 2. Trả lại lượt cho người vừa đi (người yêu cầu undo)
                const requesterId = turnState.currentTurn === turnState.player1Id 
                    ? turnState.player2Id 
                    : turnState.player1Id;
                
                turnState.currentTurn = requesterId;

                // 3. Xóa nước đi cuối trong buffer
                if (turnState.moves_buffer.length > 0) {
                    turnState.moves_buffer.pop();
                }

                // 4. Broadcast cho cả phòng thực hiện undo
                io.to(roomKey).emit("undo_executed", {
                    currentTurn: requesterId,
                    moveCount: turnState.moveCount
                });
            }
        } catch (error) {
            console.error("[Game] accept_undo error:", error);
        }
    });

    socket.on("reject_undo", ({ roomId }) => {
        const roomKey = `game_room_${roomId}`;
        socket.to(roomKey).emit("undo_rejected", {
            username: socket.user.username,
            message: "Đối thủ từ chối cho bạn đi lại."
        });
    });

    // ===================================
    // XỬ LÝ NGẮT KẾT NỐI KHI ĐANG CHƠI
    // ===================================
    socket.on("disconnect", () => {
        if (socket.currentRoomId) {
            socket.to(`game_room_${socket.currentRoomId}`).emit("opponent_disconnected", { userId: socket.user.id, username: socket.user.username });
        }
    });
};
