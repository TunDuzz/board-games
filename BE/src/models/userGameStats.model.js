const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserGameStats = sequelize.define(
  "UserGameStats",
  {
    user_id: { type: DataTypes.INTEGER, primaryKey: true },
    game_type_id: { type: DataTypes.INTEGER, primaryKey: true },
    elo: { type: DataTypes.INTEGER, defaultValue: 1200 },
    matches: { type: DataTypes.INTEGER, defaultValue: 0 },
    wins: { type: DataTypes.INTEGER, defaultValue: 0 },
    losses: { type: DataTypes.INTEGER, defaultValue: 0 },
    draws: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    tableName: "user_game_stats",
    timestamps: false,
  }
);

module.exports = UserGameStats;
