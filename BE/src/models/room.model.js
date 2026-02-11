const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Room = sequelize.define(
  "Room",
  {
    room_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    game_type_id: DataTypes.INTEGER,
    host_id: DataTypes.INTEGER,
    is_private: { type: DataTypes.BOOLEAN, defaultValue: false },
    room_code: { type: DataTypes.STRING(10), unique: true },
    password_hash: DataTypes.STRING(255),
    status: {
      type: DataTypes.ENUM("waiting", "playing", "ended"),
      defaultValue: "waiting",
    },
  },
  {
    tableName: "rooms",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = Room;
