const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define(
  "User",
  {
    user_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(50), unique: true, allowNull: false },
    email: { type: DataTypes.STRING(100), unique: true, allowNull: false },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    full_name: DataTypes.STRING(100),
    birth_year: DataTypes.INTEGER,
    avatar_url: { type: DataTypes.STRING(255), defaultValue: "/default-avatar.png" },
    rank: { type: DataTypes.STRING(20), defaultValue: "Bronze" },
    elo: { type: DataTypes.INTEGER, defaultValue: 1000 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "last_active_at",
  }
);

module.exports = User;
