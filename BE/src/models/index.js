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
const GameInvite = require("./gameInvite.model");
const MatchmakingQueue = require("./matchmakingQueue.model");
const RoomPlayer = require("./roomPlayer.model");


User.hasOne(UserStats, { foreignKey: "user_id" });
User.hasOne(UserSettings, { foreignKey: "user_id" });

User.hasMany(UserGameStats, { as: "gameStats", foreignKey: "user_id" });
UserGameStats.belongsTo(User, { as: "user", foreignKey: "user_id" });

User.belongsToMany(GameType, { through: UserGameStats, foreignKey: "user_id", as: 'userGameTypes' });
GameType.belongsToMany(User, { through: UserGameStats, foreignKey: "game_type_id", as: 'typeUsers' });

Room.belongsTo(User, { as: "host", foreignKey: "host_id" });
Room.belongsTo(GameType, { foreignKey: "game_type_id" });
GameType.hasMany(Room, { foreignKey: "game_type_id" });

Match.belongsTo(Room, { foreignKey: "room_id" });
Match.belongsTo(User, { as: "player1", foreignKey: "player1_id" });
Match.belongsTo(User, { as: "player2", foreignKey: "player2_id" });
Match.belongsTo(User, { as: "winner", foreignKey: "winner_id" });
Match.belongsTo(GameType, { foreignKey: "game_type_id" });
GameType.hasMany(Match, { foreignKey: "game_type_id" });

User.hasMany(Match, { as: "matchesAsPlayer1", foreignKey: "player1_id" });
User.hasMany(Match, { as: "matchesAsPlayer2", foreignKey: "player2_id" });
User.hasMany(Match, { as: "wonMatches", foreignKey: "winner_id" });

Move.belongsTo(Match, { foreignKey: "match_id" });

Chat.belongsTo(Room, { foreignKey: "room_id" });
Chat.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(Chat, { foreignKey: "user_id" });

GameInvite.belongsTo(Room, { foreignKey: "room_id" });
GameInvite.belongsTo(User, { as: "fromUser", foreignKey: "from_user_id" });
GameInvite.belongsTo(User, { as: "toUser", foreignKey: "to_user_id" });

User.hasMany(GameInvite, { as: "sentInvites", foreignKey: "from_user_id" });
User.hasMany(GameInvite, { as: "receivedInvites", foreignKey: "to_user_id" });

Room.hasMany(GameInvite, { foreignKey: "room_id" });

MatchmakingQueue.belongsTo(User, { foreignKey: "user_id" });
MatchmakingQueue.belongsTo(GameType, { foreignKey: "game_type_id" });

User.hasMany(MatchmakingQueue, { foreignKey: "user_id" });
GameType.hasMany(MatchmakingQueue, { foreignKey: "game_type_id" });

RoomPlayer.belongsTo(Room, { foreignKey: "room_id" });
RoomPlayer.belongsTo(User, { foreignKey: "user_id" });

Room.hasMany(RoomPlayer, { foreignKey: "room_id" });
User.hasMany(RoomPlayer, { foreignKey: "user_id" });

// Friend relationships
Friend.belongsTo(User, { as: "user", foreignKey: "user_id" });
Friend.belongsTo(User, { as: "friendUser", foreignKey: "friend_id" });

User.hasMany(Friend, { as: "friendsInitiated", foreignKey: "user_id" });
User.hasMany(Friend, { as: "friendsReceived", foreignKey: "friend_id" });


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
  GameInvite,
  MatchmakingQueue,
  RoomPlayer,
};
