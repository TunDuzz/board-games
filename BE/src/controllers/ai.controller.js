
/**
 * API: Tạo nước đi cho bot (Chơi với máy)
 */
exports.makeAiMove = async (req, res) => {
  try {
    const { gameType, boardState, validMoves, botRole, difficulty } = req.body;

    if (!gameType || !boardState) {
        return res.status(400).json({ message: "Thiếu gameType hoặc boardState" });
    }

    let prompt = "";
    if (gameType === "caro") {
        const { getBestCaroMove } = require("../utils/caroMinimax");
        const result = getBestCaroMove(boardState, botRole === "player1" ? "Black" : "White", difficulty);
        return res.json({
            message: "Thuật toán Minimax gợi ý nước đi thành công!",
            move: result.move,
            score: result.score
        });
    } else if (gameType === "chess") {
        const { getBestChessMove } = require("../utils/chessMinimax");
        const result = getBestChessMove(boardState, botRole === "player1" ? "white" : "black", difficulty);
        return res.json({
            message: "Thuật toán Minimax (Chess) gợi ý nước đi thành công!",
            move: result.move,
            score: result.score
        });
    } else if (gameType === "xiangqi") {
        const { getBestXiangqiMove } = require("../utils/xiangqiMinimax");
        const result = getBestXiangqiMove(boardState, botRole === "player1" ? "red" : "black", difficulty);
        return res.json({
            message: "Thuật toán Minimax (Xiangqi) gợi ý nước đi thành công!",
            move: result.move,
            score: result.score
        });
    } else {
        return res.status(400).json({ message: "Loại game không hỗ trợ AI" });
    }

  } catch (error) {
    console.error("[AI Move Error]:", error);
    res.status(500).json({ message: "Lỗi AI phát sinh", error: error.message });
  }
};

exports.analyzePosition = async (req, res) => {
  try {
    const { gameType, boardState, turn, movesHistory } = req.body;

    if (!gameType || !boardState) {
      return res.status(400).json({ message: "Thiếu gameType hoặc boardState" });
    }

    let analysis = null;

    if (gameType === "caro") {
      const { getBestCaroMove } = require("../utils/caroMinimax");
      analysis = getBestCaroMove(movesHistory || boardState, turn === "player1" ? "Black" : "White", "hard");
    } else if (gameType === "chess") {
      const { getBestChessMove } = require("../utils/chessMinimax");
      analysis = getBestChessMove(boardState, turn, "hard");
    } else if (gameType === "xiangqi") {
      const { getBestXiangqiMove } = require("../utils/xiangqiMinimax");
      analysis = getBestXiangqiMove(boardState, turn, "hard");
    }

    return res.json({
      bestMove: analysis?.move,
      evalScore: analysis?.score,
      message: "Phân tích thành công"
    });
  } catch (error) {
    console.error("[Analyze Error]:", error);
    res.status(500).json({ message: "Lỗi phân tích", error: error.message });
  }
};

