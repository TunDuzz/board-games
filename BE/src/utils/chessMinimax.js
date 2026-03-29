/**
 * Thuật toán Minimax + Alpha-Beta Pruning dành cho game Chess (Cờ Vua)
 */

const PIECE_VALUES = {
    'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 900, // Đen (Thường viết thường)
    'P': 10, 'N': 30, 'B': 30, 'R': 50, 'Q': 90, 'K': 900  // Trắng (Viết hoa)
};

const { getValidMoves, getPieceColor } = require('./chessLogic'); // Giả sử tui sẽ copy file logic qua đây

exports.getBestChessMove = (board, turn = 'black', difficulty = 'medium') => {
    let bestMove = null;
    let bestScore = turn === 'white' ? -Infinity : Infinity;

    const allMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && getPieceColor(piece) === turn) {
                const moves = getValidMoves(board, r, c);
                moves.forEach(m => {
                    allMoves.push({ from: { row: r, col: c }, to: { row: m.row, col: m.col } });
                });
            }
        }
    }

    if (allMoves.length === 0) return null;

    // Cấp độ khó tương ứng với độ sâu
    let depth = 2;
    if (difficulty === 'easy') depth = 1;
    else if (difficulty === 'hard') depth = 3;

    for (const move of allMoves) {
        const backBoard = board.map(row => [...row]);
        const piece = backBoard[move.from.row][move.from.col];
        backBoard[move.to.row][move.to.col] = piece;
        backBoard[move.from.row][move.from.col] = null;

        const score = minimax(backBoard, depth - 1, turn === 'white' ? false : true, -Infinity, Infinity, turn);

        if (turn === 'white') {
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        } else {
            if (score < bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
    }

    return bestMove;
};

function minimax(board, depth, isMaximizing, alpha, beta, turn) {
    if (depth === 0) {
        return evaluateBoard(board);
    }

    const currentTurn = isMaximizing ? 'white' : 'black';
    const allMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] && getPieceColor(board[r][c]) === currentTurn) {
                const moves = getValidMoves(board, r, c);
                moves.forEach(m => allMoves.push({ from: { r, c }, to: m }));
            }
        }
    }

    if (allMoves.length === 0) return evaluateBoard(board);

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of allMoves) {
            const piece = board[move.from.r][move.from.c];
            board[move.to.row][move.to.col] = piece;
            board[move.from.r][move.from.c] = null;

            const ev = minimax(board, depth - 1, false, alpha, beta, turn);
            board[move.from.r][move.from.c] = piece;
            board[move.to.row][move.to.col] = null; // Hoàn tác (chỉ đơn giản vậy nếu ko phải ăn quân, ăn quân cần lặp lại backBoard)

            maxEval = Math.max(maxEval, ev);
            alpha = Math.max(alpha, ev);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of allMoves) {
            const piece = board[move.from.r][move.from.c];
            board[move.to.row][move.to.col] = piece;
            board[move.from.r][move.from.c] = null;

            const ev = minimax(board, depth - 1, true, alpha, beta, turn);
            board[move.from.r][move.from.c] = piece;
            board[move.to.row][move.to.col] = null;

            minEval = Math.min(minEval, ev);
            beta = Math.min(beta, ev);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function evaluateBoard(board) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece) {
                const value = PIECE_VALUES[piece] || 0;
                if (getPieceColor(piece) === 'white') {
                    score += value;
                } else {
                    score -= value;
                }
            }
        }
    }
    return score;
}
