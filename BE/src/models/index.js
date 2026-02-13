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
Match.belongsTo(User, { as: "player1", foreignKey: "player1_id" });
Match.belongsTo(User, { as: "player2", foreignKey: "player2_id" });
Match.belongsTo(User, { as: "winner", foreignKey: "winner_id" });

User.hasMany(Match, { as: "matchesAsPlayer1", foreignKey: "player1_id" });
User.hasMany(Match, { as: "matchesAsPlayer2", foreignKey: "player2_id" });
User.hasMany(Match, { as: "wonMatches", foreignKey: "winner_id" });

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
