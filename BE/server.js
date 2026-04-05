require("dotenv").config();
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
const seedAdmin = require("./src/scripts/seed"); // Import script khởi tạo Admin
const { onlineUsers, inGameUsers } = setupSocket(io);

// Chia sẻ io instance để dùng trong controllers
app.set("io", io);
app.set("onlineUsers", onlineUsers);
app.set("inGameUsers", inGameUsers);

app.get("/", (req, res) => {
  res.json({ message: "Game Backend & Socket Running 🚀" });
});

sequelize.authenticate()
  .then(() => {
    console.log("DB Connected ");
    return sequelize.sync({ alter: true });
  })
  .then(async () => {
    console.log("DB Synced ");
    // Khởi tạo tài khoản Admin mặc định
    await seedAdmin();
  })
  .catch(err => console.error("DB Error ", err));

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
  console.log("DB_NAME:", process.env.DB_NAME);
  console.log("DB_USER:", process.env.DB_USER);
});
