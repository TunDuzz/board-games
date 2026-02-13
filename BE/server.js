const express = require("express");
const { sequelize } = require("./src/models");
const appPath = require.resolve("./src/app");
const app = require(appPath);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Game Backend Running 🚀" });
});

sequelize.authenticate()
  .then(() => {
    console.log("DB Connected ");
    return sequelize.sync();
  })
  .then(() => console.log("DB Synced "))
  .catch(err => console.error("DB Error ", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
