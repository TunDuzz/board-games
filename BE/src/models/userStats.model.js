const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserStats = sequelize.define(
  "UserStats",
  {
    user_id: { type: DataTypes.INTEGER, primaryKey: true },
    total_matches: { type: DataTypes.INTEGER, defaultValue: 0 },
    wins: { type: DataTypes.INTEGER, defaultValue: 0 },
    losses: { type: DataTypes.INTEGER, defaultValue: 0 },
    draws: { type: DataTypes.INTEGER, defaultValue: 0 },
    total_play_time_seconds: { type: DataTypes.INTEGER, defaultValue: 0 },
    current_win_streak: { type: DataTypes.INTEGER, defaultValue: 0 },
    best_win_streak: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    tableName: "user_stats",
    timestamps: false,
  }
);

module.exports = UserStats;
