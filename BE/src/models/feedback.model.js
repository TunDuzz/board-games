const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Feedback = sequelize.define("Feedback", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "pending", // pending, reviewed, resolved
  },
}, {
  tableName: "Feedbacks",
  timestamps: true,
});

module.exports = Feedback;
