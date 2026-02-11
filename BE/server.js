const express = require("express");
const { sequelize } = require("./src/models");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Game Backend Running 🚀" });
});

sequelize.authenticate()
  .then(() => console.log("DB Connected "))
  .catch(err => console.error("DB Error ", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
