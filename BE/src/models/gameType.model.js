const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const GameType = sequelize.define(
  "GameType",
  {
    game_type_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: DataTypes.ENUM("chess", "xiangqi", "caro"),
    description: DataTypes.STRING(100),
  },
  {
    tableName: "game_types",
    timestamps: false,
  }
);

module.exports = GameType;
