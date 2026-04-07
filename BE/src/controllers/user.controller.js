const { User, Match, UserStats, UserGameStats, Move, GameType } = require("../models");
const { Op } = require("sequelize");

// Lấy thông tin cá nhân
const getProfile = async ({ userId }) => {
    const user = await User.findByPk(userId, {
        attributes: { exclude: ["password_hash"] },
        include: [
            { model: UserStats },
            { model: UserGameStats, as: "gameStats" }
        ]
    });

    if (!user) {
        const err = new Error("Không tìm thấy người dùng!");
        err.statusCode = 404;
        throw err;
    }

    const userData = user.toJSON();
    const elos = userData.gameStats ? userData.gameStats.map(s => s.elo) : [];
    userData.elo = elos.length > 0 ? Math.max(...elos) : 0;

    return userData;
};

// Cập nhật thông tin (avatar, tên)
const updateProfile = async ({ userId, full_name, avatar_url }) => {
    const user = await User.findByPk(userId);
    if (!user) {
        const err = new Error("Không tìm thấy người dùng!");
        err.statusCode = 404;
        throw err;
    }

    user.full_name = full_name || user.full_name;
    user.avatar_url = avatar_url || user.avatar_url;
    await user.save();

    return { message: "Cập nhật thành công!", user };
};

// Lấy lịch sử đấu
const getMatchHistory = async ({ userId, gameType }) => {
    const GAME_TYPE_IDS = { chess: 1, xiangqi: 2, caro: 3 };

    const whereClause = {
        [Op.or]: [{ player1_id: userId }, { player2_id: userId }],
        end_time: { [Op.not]: null }
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

    const enriched = matches.map(m => {
        const raw = m.toJSON();
        let user_result = "draw";
        if (raw.result === "draw") {
            user_result = "draw";
        } else if (raw.winner_id) {
            user_result = raw.winner_id === userId ? "win" : "lose";
        } else if (raw.result === "resign") {
            user_result = "lose";
        }
        return { ...raw, user_result };
    });

    return enriched;
};

// Lấy danh sách nước đi của một trận đấu để Replay
const getMatchMoves = async ({ matchId }) => {
    const moves = await Move.findAll({
        where: { match_id: parseInt(matchId) },
        order: [["move_order", "ASC"]]
    });

    const match = await Match.findOne({
        where: { match_id: parseInt(matchId) },
        include: [{ model: GameType, attributes: ["name"] }]
    });

    if (!match) {
        const err = new Error("Không tìm thấy trận đấu");
        err.statusCode = 404;
        throw err;
    }

    return {
        match,
        moves: moves.map(m => ({
            ...m.toJSON(),
            move_data: typeof m.move_data === "string" ? JSON.parse(m.move_data) : m.move_data
        }))
    };
};

// Lấy bảng xếp hạng theo từng loại game
const getRankings = async ({ gameType }) => {
    const GAME_TYPE_IDS = { chess: 1, xiangqi: 2, caro: 3 };
    const gameTypeId = gameType ? GAME_TYPE_IDS[gameType] : null;

    if (gameTypeId) {
        const gameStats = await UserGameStats.findAll({
            where: { game_type_id: gameTypeId },
            include: [{
                model: User,
                as: "user",
                attributes: ["username", "full_name", "avatar_url"]
            }],
            order: [["elo", "DESC"]],
            limit: 50
        });

        const rankings = gameStats
            .filter(gs => gs.user)
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

        return rankings;
    }

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
    return rankings.slice(0, 50);
};

const changePassword = async ({ userId, currentPassword, newPassword }) => {
    const user = await User.findByPk(userId);
    if (!user) {
        const err = new Error("Không tìm thấy người dùng!");
        err.statusCode = 404;
        throw err;
    }

    const bcrypt = require("bcryptjs");
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
        const err = new Error("Mật khẩu hiện tại không chính xác!");
        err.statusCode = 400;
        throw err;
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return { message: "Đổi mật khẩu thành công!" };
};

const uploadAvatar = async ({ userId, file }) => {
    if (!file) {
        const err = new Error("Vui lòng chọn ảnh!");
        err.statusCode = 400;
        throw err;
    }

    const user = await User.findByPk(userId);
    if (!user) {
        const err = new Error("Không tìm thấy người dùng!");
        err.statusCode = 404;
        throw err;
    }

    // Lưu path tương đối vào DB
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    user.avatar_url = avatarUrl;
    await user.save();

    return { 
        message: "Tải ảnh lên thành công!", 
        avatarUrl,
        user: {
            user_id: user.user_id,
            username: user.username,
            avatar_url: user.avatar_url
        }
    };
};

module.exports = { 
    getProfile, 
    updateProfile, 
    getMatchHistory, 
    getRankings, 
    changePassword, 
    getMatchMoves,
    uploadAvatar 
};
