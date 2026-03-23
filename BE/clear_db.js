const { sequelize, Move, Match, Chat, GameInvite, RoomPlayer, Room, MatchmakingQueue, Friend, UserGameStats, UserStats, UserSettings, User } = require("./src/models");

async function run() {
    try {
        await sequelize.authenticate();
        console.log("Connected to DB!");

        // Danh sách các bảng cần xóa theo thứ tự dể tránh lỗi Foreign Key
        // 1. Move (Cần Match ID)
        console.log("Emptying Move table...");
        await Move.destroy({ where: {}, force: true });

        // 2. Match
        console.log("Emptying Match table...");
        await Match.destroy({ where: {}, force: true });

        // 3. Chat
        console.log("Emptying Chat table...");
        await Chat.destroy({ where: {}, force: true });

        // 4. GameInvite
        console.log("Emptying GameInvite table...");
        await GameInvite.destroy({ where: {}, force: true });

        // 5. RoomPlayer
        console.log("Emptying RoomPlayer table...");
        await RoomPlayer.destroy({ where: {}, force: true });

        // 6. MatchmakingQueue
        console.log("Emptying MatchmakingQueue table...");
        await MatchmakingQueue.destroy({ where: {}, force: true });

        // 7. Friend
        console.log("Emptying Friend table...");
        await Friend.destroy({ where: {}, force: true });

        // 8. Room
        console.log("Emptying Room table...");
        await Room.destroy({ where: {}, force: true });

        // 9. Reset User Statistics
        console.log("Emptying UserGameStats...");
        await UserGameStats.destroy({ where: {}, force: true });

        console.log("Emptying UserStats...");
        await UserStats.destroy({ where: {}, force: true });

        console.log("Emptying UserSettings...");
        await UserSettings.destroy({ where: {}, force: true });

        // Tạo lại UserStats mặc định cho tất cả User đang có dể ko bị lỗi render Dashboard
        console.log("Re-initializing default UserStats/Settings...");
        const users = await User.findAll();
        for (const u of users) {
            await UserStats.create({ user_id: u.user_id, total_games: 0, wins: 0, losses: 0 }).catch(() => {});
            await UserSettings.create({ user_id: u.user_id }).catch(() => {});
        }

        console.log("Database reset complete! Users kept intact.");

    } catch (err) {
        console.error("Error during reset:", err);
    } finally {
        await sequelize.close();
    }
}

run();
