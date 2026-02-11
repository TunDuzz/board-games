const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Chat = sequelize.define(
  "Chat",
  {
    chat_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    room_id: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER,
    message: DataTypes.TEXT,
  },
  {
    tableName: "chats",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = Chat;
