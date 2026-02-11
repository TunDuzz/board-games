const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserSettings = sequelize.define(
  "UserSettings",
  {
    user_id: { type: DataTypes.INTEGER, primaryKey: true },
    sound_enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    theme: { type: DataTypes.ENUM("light", "dark"), defaultValue: "light" },
    language: { type: DataTypes.STRING(10), defaultValue: "vi" },
  },
  {
    tableName: "user_settings",
    timestamps: false,
  }
);

module.exports = UserSettings;
