const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { sequelize } = require("./src/models");
const appPath = require.resolve("./src/app");
const app = require(appPath);

app.use(express.json());

// Tạo HTTP Server từ Express App
const server = http.createServer(app);

// Khởi tạo Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // Cập nhật đúng domain của web FE
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Import socket setup logic
const setupSocket = require("./src/socket");
setupSocket(io);

app.get("/", (req, res) => {
  res.json({ message: "Game Backend & Socket Running 🚀" });
});

sequelize.authenticate()
  .then(() => {
    console.log("DB Connected ");
    return sequelize.sync();
  })
  .then(() => console.log("DB Synced "))
  .catch(err => console.error("DB Error ", err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server running on port " + PORT));
