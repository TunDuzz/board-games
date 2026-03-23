
/**
 * API: Tạo nước đi cho bot (Chơi với máy)
 */
exports.makeAiMove = async (req, res) => {
  try {
    const { gameType, boardState, validMoves, botRole } = req.body;

    if (!gameType || !boardState) {
        return res.status(400).json({ message: "Thiếu gameType hoặc boardState" });
    }

    let prompt = "";
    if (gameType === "caro") {
        const { getBestCaroMove } = require("../utils/caroMinimax");
        const moveResult = getBestCaroMove(boardState, botRole === "player1" ? "Black" : "White");
        return res.json({
            message: "Thuật toán Minimax gợi ý nước đi thành công!",
            move: moveResult
        });
    } else if (false) { // Vô hiệu hóa prompt cũ
        prompt = `
You are an expert Caro (Gomoku) AI.
The board size is 15x15. Coordinates go from 0 to 14.
Here is the current list of moves played so far (player1 is X, player2/Bot is O):
${JSON.stringify(boardState)}

You are playing as: ${botRole || 'player2'}

Suggest the absolute best Next move to block five-in-a-row or win.
Respond ONLY with a JSON object containing coordinate 'x' and 'y':
{ "x": number, "y": number }
`;
    } else if (gameType === "chess") {
        const { getBestChessMove } = require("../utils/chessMinimax");
        const moveResult = getBestChessMove(boardState, botRole === "player1" ? "white" : "black");
        return res.json({
            message: "Thuật toán Minimax (Chess) gợi ý nước đi thành công!",
            move: moveResult
        });
    } else if (gameType === "xiangqi") {
        const { getBestXiangqiMove } = require("../utils/xiangqiMinimax");
        const moveResult = getBestXiangqiMove(boardState, botRole === "player1" ? "red" : "black");
        return res.json({
            message: "Thuật toán Minimax (Xiangqi) gợi ý nước đi thành công!",
            move: moveResult
        });
    } else {
        return res.status(400).json({ message: "Loại game không hỗ trợ AI" });
    }



  } catch (error) {
    console.error("[OpenAI AI Error]:", error);
    res.status(500).json({ message: "Lỗi AI phát sinh", error: error.message });
  }
};
