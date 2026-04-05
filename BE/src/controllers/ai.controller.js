
/**
 * Tạo nước đi cho bot (Chơi với máy)
 */
exports.makeAiMove = async ({ gameType, boardState, botRole, difficulty }) => {
  if (!gameType || !boardState) {
    const err = new Error("Thiếu gameType hoặc boardState");
    err.statusCode = 400;
    throw err;
  }

  if (gameType === "caro") {
    const { getBestCaroMove } = require("../utils/caroMinimax");
    const result = getBestCaroMove(boardState, botRole === "player1" ? "Black" : "White", difficulty);
    return {
      message: "Thuật toán Minimax gợi ý nước đi thành công!",
      move: result.move,
      score: result.score
    };
  } else if (gameType === "chess") {
    const { getBestChessMove } = require("../utils/chessMinimax");
    const result = getBestChessMove(boardState, botRole === "player1" ? "white" : "black", difficulty);
    return {
      message: "Thuật toán Minimax (Chess) gợi ý nước đi thành công!",
      move: result.move,
      score: result.score
    };
  } else if (gameType === "xiangqi") {
    const { getBestXiangqiMove } = require("../utils/xiangqiMinimax");
    const result = getBestXiangqiMove(boardState, botRole === "player1" ? "red" : "black", difficulty);
    return {
      message: "Thuật toán Minimax (Xiangqi) gợi ý nước đi thành công!",
      move: result.move,
      score: result.score
    };
  } else {
    const err = new Error("Loại game không hỗ trợ AI");
    err.statusCode = 400;
    throw err;
  }
};

/**
 * Phân tích vị trí bàn cờ
 */
exports.analyzePosition = async ({ gameType, boardState, turn, movesHistory }) => {
  if (!gameType || !boardState) {
    const err = new Error("Thiếu gameType hoặc boardState");
    err.statusCode = 400;
    throw err;
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

  return {
    bestMove: analysis?.move,
    evalScore: analysis?.score,
    message: "Phân tích thành công"
  };
};
