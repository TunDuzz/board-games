const { RoomPlayer, Room, Match } = require("./src/models");
const sequelize = require("./src/config/database");

async function run() {
    try {
        await sequelize.authenticate();
        console.log("Connected to DB!");

        // Tìm User1
        const { User } = require("./src/models");
        const user = await User.findOne({ where: { username: "user1" } });
        
        if (!user) {
            console.log("User not found: user1");
            return;
        }

        const userId = user.user_id;
        console.log(`User1 ID: ${userId}`);

        // 1. Quét RoomPlayer
        const entries = await RoomPlayer.findAll({
            where: { user_id: userId },
            include: [{ model: Room }]
        });

        console.log(`Found ${entries.length} RoomPlayer entries for User1:`);
        for (const e of entries) {
            const r = e.Room;
            console.log(`- Room ID ${e.room_id}, Status: ${r ? r.status : "NULL"}`);
        }

        // 2. Clear All RoomPlayer for this user to unblock them
        const deleted = await RoomPlayer.destroy({ where: { user_id: userId } });
        console.log(`Cleared ${deleted} stale RoomPlayer entries.`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await sequelize.close();
    }
}

run();
