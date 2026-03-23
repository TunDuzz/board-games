/**
 * Thuật toán Minimax + Alpha-Beta Pruning dành cho game Xiangqi (Cờ Tướng)
 */

const PIECE_VALUES = {
    '俥': 90, '傌': 40, '炮': 45, '相': 20, '仕': 20, '兵': 10, '帥': 1000, // Red (Bottom)
    '車': 90, '馬': 40, '砲': 45, '象': 20, '士': 20, '卒': 10, '將': 1000  // Black (Top)
};

const { getValidMoves } = require('./xiangqiLogic'); 

exports.getBestXiangqiMove = (board, turn = 'black') => {
    let bestMove = null;
    let bestScore = turn === 'red' ? -Infinity : Infinity;

    const allMoves = [];
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
            const piece = board[r][c];
            if (piece && piece.color === turn) {
                const moves = getValidMoves(board, r, c);
                moves.forEach(m => {
                    allMoves.push({ from: { row: r, col: c }, to: { row: m.row, col: m.col } });
                });
            }
        }
    }

    if (allMoves.length === 0) return null;

    // Duyệt Depth 2
    const depth = 2;
    for (const move of allMoves) {
        const backBoard = board.map(row => [...row]);
        const piece = backBoard[move.from.row][move.from.col];
        const targetPiece = backBoard[move.to.row][move.to.col];

        backBoard[move.to.row][move.to.col] = piece;
        backBoard[move.from.row][move.from.col] = null;

        const score = minimax(backBoard, depth - 1, turn === 'red' ? false : true, -Infinity, Infinity, turn);

        if (turn === 'red') {
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

    const currentTurn = isMaximizing ? 'red' : 'black';
    const allMoves = [];
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
            const piece = board[r][c];
            if (piece && piece.color === currentTurn) {
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
            const target = board[move.to.row][move.to.col];

            board[move.to.row][move.to.col] = piece;
            board[move.from.r][move.from.c] = null;

            const ev = minimax(board, depth - 1, false, alpha, beta, turn);
            board[move.from.r][move.from.c] = piece;
            board[move.to.row][move.to.col] = target; 

            maxEval = Math.max(maxEval, ev);
            alpha = Math.max(alpha, ev);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of allMoves) {
            const piece = board[move.from.r][move.from.c];
            const target = board[move.to.row][move.to.col];

            board[move.to.row][move.to.col] = piece;
            board[move.from.r][move.from.c] = null;

            const ev = minimax(board, depth - 1, true, alpha, beta, turn);
            board[move.from.r][move.from.c] = piece;
            board[move.to.row][move.to.col] = target;

            minEval = Math.min(minEval, ev);
            beta = Math.min(beta, ev);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function evaluateBoard(board) {
    let score = 0;
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
            const piece = board[r][c];
            if (piece) {
                const value = PIECE_VALUES[piece.label] || 0;
                if (piece.color === 'red') {
                    score += value;
                } else {
                    score -= value;
                }
            }
        }
    }
    return score;
}
