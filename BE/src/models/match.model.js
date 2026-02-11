const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Match = sequelize.define(
  "Match",
  {
    match_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    room_id: DataTypes.INTEGER,
    game_type_id: DataTypes.INTEGER,
    player1_id: DataTypes.INTEGER,
    player2_id: DataTypes.INTEGER,
    winner_id: DataTypes.INTEGER,
    result: DataTypes.ENUM("win", "lose", "draw", "timeout", "resign"),
    start_time: DataTypes.DATE,
    end_time: DataTypes.DATE,
  },
  {
    tableName: "matches",
    timestamps: false,
  }
);

module.exports = Match;
