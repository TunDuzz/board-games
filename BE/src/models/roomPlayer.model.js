const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const RoomPlayer = sequelize.define(
  "RoomPlayer",
  {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },

    room_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    role: {
      type: DataTypes.ENUM("player1", "player2", "spectator"),
      allowNull: false,
    },

    is_ready: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "room_players",
    timestamps: true,
    createdAt: "joined_at",
    updatedAt: false,
  }
);

module.exports = RoomPlayer;
