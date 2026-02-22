const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const GameInvite = sequelize.define(
  "GameInvite",
  {
    invite_id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },

    room_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    from_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    to_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM(
        "pending",
        "accepted",
        "rejected",
        "expired",
        "cancelled"
      ),
      defaultValue: "pending",
    },

    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "game_invites",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = GameInvite;
