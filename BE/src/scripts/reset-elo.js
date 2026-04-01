const { User, UserGameStats } = require("../models");

async function resetElo() {
    try {
        const statsCount = await UserGameStats.update({ elo: 0 }, { where: {} });
        console.log(`Updated ${statsCount[0]} records in UserGameStats to elo 0`);
        
        try {
            const userCount = await User.update({ elo: 0 }, { where: {} });
            console.log(`Updated ${userCount[0]} records in Users to elo 0`);
        } catch (e) {
            console.log("Note: Users table does not have elo column or update failed (this is expected if it's only in UserGameStats)");
        }
        
        console.log("Elo reset completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error updating elo:", error);
        process.exit(1);
    }
}

// Giả lập môi trường như production để Sequelize load được models
process.chdir(__dirname + "/.."); 
resetElo();
