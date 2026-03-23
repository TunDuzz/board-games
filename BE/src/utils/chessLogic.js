/**
 * Custom Chess Logic Utility (Backend Copy)
 */

exports.getPieceColor = (piece) => {
    if (!piece) return null;
    return piece === piece.toUpperCase() ? 'white' : 'black';
};

exports.getValidMoves = (board, r, c, history = []) => {
    const piece = board[r][c];
    if (!piece) return [];

    const color = exports.getPieceColor(piece);
    let moves = getPseudoLegalMoves(board, r, c, history, false);

    // Filter: filter out moves leaving King in check
    return moves.filter(m => {
        const nextBoard = board.map(row => [...row]);
        nextBoard[m.row][m.col] = piece;
        nextBoard[r][c] = null;
        return !isCheck(nextBoard, color);
    });
};

const getPseudoLegalMoves = (board, r, c, history = [], skipCastling = true) => {
    const piece = board[r][c];
    const type = piece.toLowerCase();
    const color = exports.getPieceColor(piece);
    let moves = [];

    switch (type) {
        case 'p': moves = getPawnMoves(board, r, c, color); break;
        case 'r': moves = getRookMoves(board, r, c, color); break;
        case 'n': moves = getKnightMoves(board, r, c, color); break;
        case 'b': moves = getBishopMoves(board, r, c, color); break;
        case 'q': moves = getQueenMoves(board, r, c, color); break;
        case 'k': moves = getKingMoves(board, r, c, color, history, skipCastling); break;
    }

    return moves.filter(m => {
        if (m.row < 0 || m.row > 7 || m.col < 0 || m.col > 7) return false;
        const target = board[m.row][m.col];
        return !target || exports.getPieceColor(target) !== color;
    });
};

const getPawnMoves = (board, r, c, color) => {
    const moves = [];
    const dir = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;

    if (!board[r + dir]?.[c]) {
        moves.push({ row: r + dir, col: c });
        if (r === startRow && !board[r + 2 * dir]?.[c]) {
            moves.push({ row: r + 2 * dir, col: c });
        }
    }
    for (let dc of [-1, 1]) {
        const target = board[r + dir]?.[c + dc];
        if (target && exports.getPieceColor(target) !== color) {
            moves.push({ row: r + dir, col: c + dc });
        }
    }
    return moves;
};

const getSlidingMoves = (board, r, c, color, directions) => {
    const moves = [];
    for (let [dr, dc] of directions) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const target = board[nr][nc];
            if (!target) {
                moves.push({ row: nr, col: nc });
            } else {
                if (exports.getPieceColor(target) !== color) moves.push({ row: nr, col: nc });
                break;
            }
            nr += dr;
            nc += dc;
        }
    }
    return moves;
};

const getRookMoves = (board, r, c, color) => getSlidingMoves(board, r, c, color, [[0, 1], [0, -1], [1, 0], [-1, 0]]);
const getBishopMoves = (board, r, c, color) => getSlidingMoves(board, r, c, color, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
const getQueenMoves = (board, r, c, color) => [...getRookMoves(board, r, c, color), ...getBishopMoves(board, r, c, color)];
const getKnightMoves = (board, r, c, color) => {
    const candidates = [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2]];
    return candidates.map(([dr, dc]) => ({ row: r + dr, col: c + dc }));
};
const getKingMoves = (board, r, c, color) => {
    const moves = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            moves.push({ row: r + dr, col: c + dc });
        }
    }
    return moves;
};

const findKing = (board, color) => {
    const kingChar = color === 'white' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === kingChar) return { row: r, col: c };
        }
    }
    return null;
};

const isSquareAttacked = (board, r, c, attackerColor) => {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && exports.getPieceColor(piece) === attackerColor) {
                if (piece.toLowerCase() === 'p') {
                    const dir = attackerColor === 'white' ? -1 : 1;
                    if (row + dir === r && (col - 1 === c || col + 1 === c)) return true;
                    continue;
                }
                const moves = getPseudoLegalMoves(board, row, col, [], true);
                if (moves.some(m => m.row === r && m.col === c)) return true;
            }
        }
    }
    return false;
};

const isCheck = (board, color) => {
    const kingPos = findKing(board, color);
    if (!kingPos) return false;
    return isSquareAttacked(board, kingPos.row, kingPos.col, color === 'white' ? 'black' : 'white');
};
