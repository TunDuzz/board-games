    const { User, Match, UserStats, UserGameStats, Move, GameType } = require("../models");
    const { Op } = require("sequelize");

    // Lấy thông tin cá nhân
    const getProfile = async (req, res) => {
        try {
            const user = await User.findByPk(req.user.id, {
                attributes: { exclude: ["password_hash"] }, // Không trả về mật khẩu
                include: [
                    { model: UserStats },
                    { model: UserGameStats, as: "gameStats" }
                ]
            });

            if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng!" });

            const userData = user.toJSON();
            const elos = userData.gameStats ? userData.gameStats.map(s => s.elo) : [];
            userData.elo = elos.length > 0 ? Math.max(...elos) : 0;

            res.json(userData);
        } catch (error) {
            console.error("[Profile Error]:", error);
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
            const { gameType } = req.query; // "chess", "xiangqi", "caro"

            const GAME_TYPE_IDS = { chess: 1, xiangqi: 2, caro: 3 };

            const whereClause = {
                [Op.or]: [{ player1_id: userId }, { player2_id: userId }],
                end_time: { [Op.not]: null } // chỉ lấy trận đã kết thúc
            };

            if (gameType && GAME_TYPE_IDS[gameType]) {
                whereClause.game_type_id = GAME_TYPE_IDS[gameType];
            }

            const matches = await Match.findAll({
                where: whereClause,
                include: [
                    { model: GameType, attributes: ["name"] },
                    { model: User, as: "player1", attributes: ["user_id", "username", "full_name", "avatar_url"] },
                    { model: User, as: "player2", attributes: ["user_id", "username", "full_name", "avatar_url"] },
                ],
                order: [["end_time", "DESC"]],
                limit: 50
            });

            // Tính sẵn kết quả cho user hiện tại
            const enriched = matches.map(m => {
                const raw = m.toJSON();
                let user_result = "draw";
                if (raw.result === "draw") {
                    user_result = "draw";
                } else if (raw.winner_id) {
                    user_result = raw.winner_id === userId ? "win" : "lose";
                } else if (raw.result === "resign") {
                    // Nếu resign mà không có winner_id thì user hiện tại là người thua (họ resign)
                    user_result = "lose";
                }
                return { ...raw, user_result };
            });

            res.json(enriched);
        } catch (error) {
            console.error("[Match History Error]:", error);
            res.status(500).json({ message: "Lỗi server!", error: error.message });
        }
    };


    // Lấy danh sách nước đi của một trận đấu để Replay
    const getMatchMoves = async (req, res) => {
        try {
            const { matchId } = req.params;
            const moves = await Move.findAll({
                where: { match_id: parseInt(matchId) },
                order: [["move_order", "ASC"]]
            });

            const match = await Match.findOne({
                where: { match_id: parseInt(matchId) },
                include: [{ model: GameType, attributes: ["name"] }]
            });

            if (!match) return res.status(404).json({ message: "Không tìm thấy trận đấu" });

            res.json({
                match,
                moves: moves.map(m => ({
                    ...m.toJSON(),
                    move_data: typeof m.move_data === "string" ? JSON.parse(m.move_data) : m.move_data
                }))
            });
        } catch (error) {
            console.error("[Match Moves Error]:", error);
            res.status(500).json({ message: "Lỗi server!", error: error.message });
        }
    };

    // Lấy bảng xếp hạng theo từng loại game
    const getRankings = async (req, res) => {
        try {
            const { gameType } = req.query; // "chess", "xiangqi", "caro"

            // Tìm game_type_id dựa theo tên
            const GAME_TYPE_IDS = { chess: 1, xiangqi: 2, caro: 3 };
            const gameTypeId = gameType ? GAME_TYPE_IDS[gameType] : null;

            if (gameTypeId) {
                // Bảng xếp hạng theo game cụ thể
                const gameStats = await UserGameStats.findAll({
                    where: { game_type_id: gameTypeId },
                    include: [
                        {
                            model: User,
                            as: "user",
                            attributes: ["username", "full_name", "avatar_url"]
                        }
                    ],
                    order: [["elo", "DESC"]],
                    limit: 50
                });

                const rankings = gameStats
                    .filter(gs => gs.user) // loại bỏ record không có user
                    .map(gs => {
                        const winRate = gs.matches > 0
                            ? Math.round((gs.wins / gs.matches) * 100) + "%"
                            : "0%";
                        return {
                            username: gs.user.username,
                            displayName: gs.user.full_name || gs.user.username,
                            avatarUrl: gs.user.avatar_url,
                            elo: gs.elo || 0,
                            wins: gs.wins || 0,
                            losses: gs.losses || 0,
                            draws: gs.draws || 0,
                            totalGames: gs.matches || 0,
                            winRate
                        };
                    });

                return res.json(rankings);
            }

            // Fallback: bảng tổng hợp (lấy ELO cao nhất trong tất cả game)
            const users = await User.findAll({
                attributes: ["username", "full_name", "avatar_url"],
                include: [
                    { model: UserStats, attributes: ["total_matches", "wins"] },
                    { model: UserGameStats, as: "gameStats", attributes: ["elo"] }
                ]
            });

            const rankings = users.map(user => {
                const stats = user.UserStats || { total_matches: 0, wins: 0 };
                const winRate = stats.total_matches > 0
                    ? Math.round((stats.wins / stats.total_matches) * 100) + "%"
                    : "0%";
                const elos = user.gameStats ? user.gameStats.map(s => s.elo) : [];
                const maxElo = elos.length > 0 ? Math.max(...elos) : 0;

                return {
                    username: user.username,
                    displayName: user.full_name || user.username,
                    avatarUrl: user.avatar_url,
                    elo: maxElo,
                    totalGames: stats.total_matches,
                    winRate
                };
            });

            rankings.sort((a, b) => b.elo - a.elo);
            res.json(rankings.slice(0, 50));
        } catch (error) {
            console.error("[Rankings Error]:", error);
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

    module.exports = { getProfile, updateProfile, getMatchHistory, getRankings, changePassword, getMatchMoves };
