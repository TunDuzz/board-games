/**
 * Thuật toán Minimax + Alpha-Beta Pruning dành cho game Xiangqi (Cờ Tướng)
 * Nâng cấp: Piece-Square Tables (PST) + phân biệt độ khó
 */

const { getValidMoves } = require('./xiangqiLogic');

// Giá trị cơ bản (cân bằng theo luật cờ tướng thực tế)
const PIECE_VALUES = {
    // Red
    '俥': 1000, '傌': 400, '炮': 450, '相': 200, '仕': 200, '兵': 100, '帥': 10000,
    // Black
    '車': 1000, '馬': 400, '砲': 450, '象': 200, '士': 200, '卒': 100, '將': 10000
};

// Piece-Square Tables cho Cờ Tướng
// Red nhìn từ dưới (hàng 9), Black nhìn từ trên (hàng 0)
const PST_RED = {
    '兵': [ // Tốt đỏ (Phổ) - khuyến khích tiến lên, qua sông muốn sang phải/trái
        [0,  0,  0,  0,  0,  0,  0,  0,  0],
        [0,  0,  0,  0,  0,  0,  0,  0,  0],
        [0,  0,  0,  0,  0,  0,  0,  0,  0],
        [0,  0,  0,  0,  0,  0,  0,  0,  0],
        [2,  0,  8,  0, 12,  0,  8,  0,  2],
        [10, 18, 22, 35, 40, 35, 22, 18, 10],
        [20, 27, 29, 40, 44, 40, 29, 27, 20],
        [20, 27, 30, 42, 44, 42, 30, 27, 20],
        [30, 30, 30, 40, 55, 40, 30, 30, 30],
        [90, 90, 90, 96, 90, 96, 90, 90, 90],
    ],
    '炮': [ // Pháo đỏ - thích ở xa, khai cuộc ở c2/c7
        [100, 100, 96, 91, 90, 91, 96, 100, 100],
        [98,  98,  96, 92, 89, 92, 96,  98,  98],
        [97,  97,  96, 91, 92, 91, 96,  97,  97],
        [96,  99,  99, 98, 100, 98, 99,  99,  96],
        [96,  96,  96, 96, 100, 96, 96,  96,  96],
        [95,  96,  99, 96, 100, 96, 99,  96,  95],
        [96,  96,  96, 96, 96,  96, 96,  96,  96],
        [97,  96,  100, 99, 101, 99, 100, 96, 97],
        [96,  97,  98, 98, 98,  98, 98,  97,  96],
        [96,  96,  97, 99, 99,  99, 97,  96,  96],
    ],
    '俥': [ // Xe đỏ - cực kỳ mạnh, muốn khai thông
        [206, 208, 207, 213, 214, 213, 207, 208, 206],
        [206, 212, 209, 216, 220, 216, 209, 212, 206],
        [206, 208, 207, 214, 216, 214, 207, 208, 206],
        [206, 213, 213, 216, 216, 216, 213, 213, 206],
        [208, 211, 211, 214, 215, 214, 211, 211, 208],
        [208, 212, 212, 214, 215, 214, 212, 212, 208],
        [206, 208, 207, 213, 214, 213, 207, 208, 206],
        [205, 205, 203, 209, 210, 209, 203, 205, 205],
        [206, 208, 206, 212, 200, 212, 206, 208, 206],
        [208, 208, 208, 215, 212, 215, 208, 208, 208],
    ],
};

exports.getBestXiangqiMove = (board, turn = 'black', difficulty = 'medium') => {
    let bestMove = null;
    let bestScore = turn === 'red' ? -Infinity : Infinity;

    const allMoves = getAllMoves(board, turn);
    if (allMoves.length === 0) return null;

    let depth = 2;
    let randomFactor = 0;
    if (difficulty === 'easy') { depth = 1; randomFactor = 0.4; }
    else if (difficulty === 'hard') { depth = 3; }

    // Sắp xếp: ưu tiên ăn quân có giá trị cao
    const sortedMoves = allMoves.sort((a, b) => {
        const pieceA = board[a.to.row][a.to.col];
        const pieceB = board[b.to.row][b.to.col];
        const valA = pieceA ? (PIECE_VALUES[pieceA.label] || 0) : 0;
        const valB = pieceB ? (PIECE_VALUES[pieceB.label] || 0) : 0;
        return valB - valA;
    });

    for (const move of sortedMoves) {
        const newBoard = board.map(row => [...row]);
        const piece = newBoard[move.from.row][move.from.col];
        const targetPiece = newBoard[move.to.row][move.to.col];
        newBoard[move.to.row][move.to.col] = piece;
        newBoard[move.from.row][move.from.col] = null;

        let score = minimax(newBoard, depth - 1, turn === 'red' ? false : true, -Infinity, Infinity);

        // Easy: thêm nhiễu ngẫu nhiên
        if (difficulty === 'easy') {
            score += (Math.random() - 0.5) * 300 * randomFactor;
        }

        if (turn === 'red') {
            if (score > bestScore) { bestScore = score; bestMove = move; }
        } else {
            if (score < bestScore) { bestScore = score; bestMove = move; }
        }
    }

    return { move: bestMove, score: bestScore };
};

function getAllMoves(board, turn) {
    const moves = [];
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
            const piece = board[r][c];
            if (piece && piece.color === turn) {
                const validMoves = getValidMoves(board, r, c);
                validMoves.forEach(m => moves.push({ from: { row: r, col: c }, to: { row: m.row, col: m.col } }));
            }
        }
    }
    return moves;
}

function minimax(board, depth, isMaximizing, alpha, beta) {
    if (depth === 0) return evaluateBoard(board);

    const turn = isMaximizing ? 'red' : 'black';
    const moves = getAllMoves(board, turn);
    if (moves.length === 0) return evaluateBoard(board);

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const piece = board[move.from.row][move.from.col];
            const target = board[move.to.row][move.to.col];
            board[move.to.row][move.to.col] = piece;
            board[move.from.row][move.from.col] = null;

            const ev = minimax(board, depth - 1, false, alpha, beta);

            board[move.from.row][move.from.col] = piece;
            board[move.to.row][move.to.col] = target;

            maxEval = Math.max(maxEval, ev);
            alpha = Math.max(alpha, ev);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const piece = board[move.from.row][move.from.col];
            const target = board[move.to.row][move.to.col];
            board[move.to.row][move.to.col] = piece;
            board[move.from.row][move.from.col] = null;

            const ev = minimax(board, depth - 1, true, alpha, beta);

            board[move.from.row][move.from.col] = piece;
            board[move.to.row][move.to.col] = target;

            minEval = Math.min(minEval, ev);
            beta = Math.min(beta, ev);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

/**
 * Evaluation: Piece value + (nếu có) PST bonus
 */
function evaluateBoard(board) {
    let score = 0;
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
            const piece = board[r][c];
            if (!piece) continue;
            const baseValue = PIECE_VALUES[piece.label] || 0;

            // PST bonus (chỉ áp dụng cho Red, Black là lật ngược)
            let pstBonus = 0;
            if (PST_RED[piece.label]) {
                const pstRow = piece.color === 'red' ? r : (9 - r);
                const pstCol = piece.color === 'red' ? c : (8 - c);
                pstBonus = (PST_RED[piece.label][pstRow]?.[pstCol] || 0) - 100; // chuẩn hóa quanh 0
            }

            if (piece.color === 'red') {
                score += baseValue + pstBonus;
            } else {
                score -= baseValue + pstBonus;
            }
        }
    }
    return score;
}
