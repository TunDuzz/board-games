const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const friendRoutes = require("./routes/friend.routes");
const gameInviteRoutes = require("./routes/gameInvite.routes");

console.log("Loading src/app.js from:", __filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/invites", gameInviteRoutes);
app.use("/api/rooms", require("./routes/room.routes"));
app.use("/api/matchmaking", require("./routes/matchmaking.routes"));
app.use("/api/ai", require("./routes/ai.routes"));
app.use("/api/feedback", require("./routes/feedback.routes"));
app.use("/api/admin", require("./routes/admin.routes"));


// Test route
app.get("/", (req, res) => {
  res.json({ message: "Game Backend Running [UPDATED_V2]" });
});

module.exports = app;
