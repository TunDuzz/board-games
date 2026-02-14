const express = require("express");
const router = express.Router();
const { getProfile, updateProfile, getMatchHistory, getRankings } = require("../controllers/user.controller");
const verifyToken = require("../middleware/auth.middleware");

// Tất cả các route này đều cần đăng nhập
router.use(verifyToken);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/change-password", require("../controllers/user.controller").changePassword);
router.get("/history", getMatchHistory);
router.get("/rankings", getRankings);

module.exports = router;
