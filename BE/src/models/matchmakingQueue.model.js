const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const MatchmakingQueue = sequelize.define(
  "MatchmakingQueue",
  {
    queue_id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    game_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    elo_snapshot: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "matchmaking_queue",
    timestamps: true,
    createdAt: "joined_at",
    updatedAt: false,
  }
);

module.exports = MatchmakingQueue;
