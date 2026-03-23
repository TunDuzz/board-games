const { Friend, User } = require("../src/models");

const testQuery = async () => {
    try {
        const requests = await Friend.findAll({
            where: {
                status: "pending"
            },
            include: [
                {
                    model: User,
                    as: "friendUser",
                    attributes: ["user_id", "username", "full_name", "avatar_url"]
                }
            ]
        });
        console.log("Found requests:", requests.length);
        if (requests.length > 0) {
            console.log("First request details:", JSON.stringify(requests[0].toJSON(), null, 2));
        } else {
            console.log("No pending requests found.");
        }
        process.exit(0);
    } catch (error) {
        const fs = require('fs');
        fs.writeFileSync('test_friend_error.txt', error.stack + '\n' + JSON.stringify(error, null, 2));
        console.error("Error in testQuery:", error);
        process.exit(1);
    }
};

testQuery();
