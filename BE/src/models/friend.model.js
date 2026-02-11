const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Friend = sequelize.define(
  "Friend",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: DataTypes.INTEGER,
    friend_id: DataTypes.INTEGER,
    status: {
      type: DataTypes.ENUM("pending", "accepted", "blocked"),
      defaultValue: "pending",
    },
  },
  {
    tableName: "friends",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = Friend;
