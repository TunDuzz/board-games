const sequelize = require("../config/database");

const User = require("./user.model");
const UserStats = require("./userStats.model");
const UserGameStats = require("./userGameStats.model");
const GameType = require("./gameType.model");
const UserSettings = require("./userSettings.model");
const Friend = require("./friend.model");
const Room = require("./room.model");
const Match = require("./match.model");
const Move = require("./move.model");
const Chat = require("./chat.model");

User.hasOne(UserStats, { foreignKey: "user_id" });
User.hasOne(UserSettings, { foreignKey: "user_id" });

User.belongsToMany(GameType, { through: UserGameStats, foreignKey: "user_id" });
GameType.belongsToMany(User, { through: UserGameStats, foreignKey: "game_type_id" });

Room.belongsTo(User, { as: "host", foreignKey: "host_id" });
Match.belongsTo(Room, { foreignKey: "room_id" });

Move.belongsTo(Match, { foreignKey: "match_id" });
Chat.belongsTo(Room, { foreignKey: "room_id" });

module.exports = {
  sequelize,
  User,
  UserStats,
  UserGameStats,
  GameType,
  UserSettings,
  Friend,
  Room,
  Match,
  Move,
  Chat,
};
