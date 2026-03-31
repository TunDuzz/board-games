/**
 * Thuật toán Minimax + Alpha-Beta Pruning dành cho game Chess (Cờ Vua)
 * Nâng cấp: Piece-Square Tables (PST) + phân biệt độ khó
 */

const { getValidMoves, getPieceColor } = require('./chessLogic');

// Giá trị cơ bản của quân cờ
const PIECE_VALUES = {
    'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000,
    'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000
};

// Piece-Square Tables (khuyến khích quân đi đến vị trí tốt)
// Trắng nhìn từ dưới lên, Đen lật ngược
const PST = {
    // Tốt (Pawn)
    p: [
        [0,  0,  0,  0,  0,  0,  0,  0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [ 5,  5, 10, 25, 25, 10,  5,  5],
        [ 0,  0,  0, 20, 20,  0,  0,  0],
        [ 5, -5,-10,  0,  0,-10, -5,  5],
        [ 5, 10, 10,-20,-20, 10, 10,  5],
        [ 0,  0,  0,  0,  0,  0,  0,  0]
    ],
    // Mã (Knight)
    n: [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    // Tượng (Bishop)
    b: [
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5, 10, 10,  5,  0,-10],
        [-10,  5,  5, 10, 10,  5,  5,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    // Xe (Rook)
    r: [
        [ 0,  0,  0,  0,  0,  0,  0,  0],
        [ 5, 10, 10, 10, 10, 10, 10,  5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [ 0,  0,  0,  5,  5,  0,  0,  0]
    ],
    // Hậu (Queen)
    q: [
        [-20,-10,-10, -5, -5,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5,  5,  5,  5,  0,-10],
        [ -5,  0,  5,  5,  5,  5,  0, -5],
        [  0,  0,  5,  5,  5,  5,  0, -5],
        [-10,  5,  5,  5,  5,  5,  0,-10],
        [-10,  0,  5,  0,  0,  0,  0,-10],
        [-20,-10,-10, -5, -5,-10,-10,-20]
    ],
    // Vua (King) - tránh trung tâm giữa game
    k: [
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],
        [-10,-20,-20,-20,-20,-20,-20,-10],
        [ 20, 20,  0,  0,  0,  0, 20, 20],
        [ 20, 30, 10,  0,  0, 10, 30, 20]
    ]
};

exports.getBestChessMove = (board, turn = 'black', difficulty = 'medium') => {
    let bestMove = null;
    let bestScore = turn === 'white' ? -Infinity : Infinity;

    const allMoves = getAllMoves(board, turn);
    if (allMoves.length === 0) return null;

    let depth = 2;
    let randomFactor = 0;
    if (difficulty === 'easy') { depth = 1; randomFactor = 0.4; }
    else if (difficulty === 'hard') { depth = 3; }

    // Sắp xếp nước đi: ưu tiên ăn quân (MVV-LVA đơn giản)
    const sortedMoves = allMoves.sort((a, b) => {
        const captureA = board[a.to.row][a.to.col] ? (PIECE_VALUES[board[a.to.row][a.to.col]] || 0) : 0;
        const captureB = board[b.to.row][b.to.col] ? (PIECE_VALUES[board[b.to.row][b.to.col]] || 0) : 0;
        return captureB - captureA;
    });

    for (const move of sortedMoves) {
        const newBoard = board.map(row => [...row]);
        const piece = newBoard[move.from.row][move.from.col];
        newBoard[move.to.row][move.to.col] = piece;
        newBoard[move.from.row][move.from.col] = null;

        let score = minimax(newBoard, depth - 1, turn === 'white' ? false : true, -Infinity, Infinity);

        // Easy: thêm nhiễu
        if (difficulty === 'easy') {
            score += (Math.random() - 0.5) * 200 * randomFactor;
        }

        if (turn === 'white') {
            if (score > bestScore) { bestScore = score; bestMove = move; }
        } else {
            if (score < bestScore) { bestScore = score; bestMove = move; }
        }
    }

    return { move: bestMove, score: bestScore };
};

function getAllMoves(board, turn) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && getPieceColor(piece) === turn) {
                const validMoves = getValidMoves(board, r, c);
                validMoves.forEach(m => moves.push({ from: { row: r, col: c }, to: { row: m.row, col: m.col } }));
            }
        }
    }
    return moves;
}

function minimax(board, depth, isMaximizing, alpha, beta) {
    if (depth === 0) return evaluateBoard(board);

    const turn = isMaximizing ? 'white' : 'black';
    const moves = getAllMoves(board, turn);
    if (moves.length === 0) return evaluateBoard(board);

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const saved = board[move.to.row][move.to.col];
            const piece = board[move.from.row][move.from.col];
            board[move.to.row][move.to.col] = piece;
            board[move.from.row][move.from.col] = null;

            const ev = minimax(board, depth - 1, false, alpha, beta);

            board[move.from.row][move.from.col] = piece;
            board[move.to.row][move.to.col] = saved;

            maxEval = Math.max(maxEval, ev);
            alpha = Math.max(alpha, ev);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const saved = board[move.to.row][move.to.col];
            const piece = board[move.from.row][move.from.col];
            board[move.to.row][move.to.col] = piece;
            board[move.from.row][move.from.col] = null;

            const ev = minimax(board, depth - 1, true, alpha, beta);

            board[move.from.row][move.from.col] = piece;
            board[move.to.row][move.to.col] = saved;

            minEval = Math.min(minEval, ev);
            beta = Math.min(beta, ev);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

/**
 * Evaluation: Piece value + Piece-Square Table bonus
 */
function evaluateBoard(board) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece) continue;
            const color = getPieceColor(piece);
            const type = piece.toLowerCase();
            const baseValue = PIECE_VALUES[piece] || 0;

            let pstBonus = 0;
            const pstTable = PST[type];
            if (pstTable) {
                // Trắng đi từ dưới lên (row 7 là hàng đầu), Đen từ trên xuống
                const pstRow = color === 'white' ? r : (7 - r);
                pstBonus = pstTable[pstRow][c];
            }

            if (color === 'white') {
                score += baseValue + pstBonus;
            } else {
                score -= baseValue + pstBonus;
            }
        }
    }
    return score;
}
