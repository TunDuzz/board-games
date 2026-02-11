const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Move = sequelize.define(
  "Move",
  {
    move_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    match_id: DataTypes.INTEGER,
    player_id: DataTypes.INTEGER,
    move_data: DataTypes.STRING(100),
    move_order: DataTypes.INTEGER,
    time_spent_ms: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    tableName: "moves",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = Move;
