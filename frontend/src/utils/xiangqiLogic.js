/**
 * Xiangqi Move Logic Utility
 * 
 * Board coordinate: board[row][col]
 * row: 0-9 (top to bottom)
 * col: 0-8 (left to right)
 * Black: Top (rows 0-4), Red: Bottom (rows 5-9)
 */

export const getValidMoves = (board, r, c) => {
    const piece = board[r][c];
    if (!piece) return [];

    const moves = [];
    const color = piece.color;
    const label = piece.label;

    switch (label) {
        case '卒': // Black Pawn
        case '兵': // Red Soldier
            moves.push(...getPawnMoves(board, r, c, color));
            break;
        case '車': // Chariot (Black/Red same logic)
        case '俥':
            moves.push(...getChariotMoves(board, r, c, color));
            break;
        case '馬': // Horse
        case '傌':
            moves.push(...getHorseMoves(board, r, c, color));
            break;
        case '砲': // Cannon
        case '炮':
            moves.push(...getCannonMoves(board, r, c, color));
            break;
        case '象': // Elephant (Black - Stay home)
        case '相': // Elephant (Red - Stay home)
            moves.push(...getElephantMoves(board, r, c, color));
            break;
        case '士': // Advisor (Black)
        case '仕': // Advisor (Red)
            moves.push(...getAdvisorMoves(board, r, c, color));
            break;
        case '將': // General
        case '帥':
            moves.push(...getGeneralMoves(board, r, c, color));
            break;
    }

    return moves.filter(m => {
        // Basic filter: must be within board and not own piece
        if (m.row < 0 || m.row > 9 || m.col < 0 || m.col > 8) return false;
        const target = board[m.row][m.col];
        return !target || target.color !== color;
    });
};

const getPawnMoves = (board, r, c, color) => {
    const moves = [];
    const isRed = color === 'red';
    const dir = isRed ? -1 : 1; // Red moves up, Black moves down
    const sideRow = isRed ? 4 : 5; // Rows where they have crossed the river

    // Move forward
    moves.push({ row: r + dir, col: c });

    // Move sideways if across the river
    const crossedRiver = isRed ? (r <= sideRow) : (r >= sideRow);
    if (crossedRiver) {
        moves.push({ row: r, col: c - 1 });
        moves.push({ row: r, col: c + 1 });
    }
    return moves;
};

const getChariotMoves = (board, r, c, color) => {
    const moves = [];
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (let [dr, dc] of dirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
            const target = board[nr][nc];
            if (!target) {
                moves.push({ row: nr, col: nc });
            } else {
                if (target.color !== color) moves.push({ row: nr, col: nc });
                break;
            }
            nr += dr;
            nc += dc;
        }
    }
    return moves;
};

const getHorseMoves = (board, r, c, color) => {
    const moves = [];
    // Horse moves 2-1, but can be blocked by "leg"
    const candidates = [
        { d: [-2, -1], leg: [-1, 0] }, { d: [-2, 1], leg: [-1, 0] },
        { d: [2, -1], leg: [1, 0] }, { d: [2, 1], leg: [1, 0] },
        { d: [-1, -2], leg: [0, -1] }, { d: [1, -2], leg: [0, -1] },
        { d: [-1, 2], leg: [0, 1] }, { d: [1, 2], leg: [0, 1] }
    ];

    for (let { d, leg } of candidates) {
        const lr = r + leg[0];
        const lc = c + leg[1];
        if (lr >= 0 && lr < 10 && lc >= 0 && lc < 9 && !board[lr][lc]) {
            moves.push({ row: r + d[0], col: c + d[1] });
        }
    }
    return moves;
};

const getCannonMoves = (board, r, c, color) => {
    const moves = [];
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (let [dr, dc] of dirs) {
        let nr = r + dr;
        let nc = c + dc;
        let jumped = false;
        while (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
            const target = board[nr][nc];
            if (!jumped) {
                if (!target) {
                    moves.push({ row: nr, col: nc });
                } else {
                    jumped = true;
                }
            } else {
                if (target) {
                    if (target.color !== color) moves.push({ row: nr, col: nc });
                    break;
                }
            }
            nr += dr;
            nc += dc;
        }
    }
    return moves;
};

const getElephantMoves = (board, r, c, color) => {
    const moves = [];
    const isRed = color === 'red';
    const candidates = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
    for (let [dr, dc] of candidates) {
        const nr = r + dr;
        const nc = c + dc;
        const legR = r + dr / 2;
        const legC = c + dc / 2;

        // Check river
        const inTerritory = isRed ? (nr >= 5) : (nr <= 4);
        if (inTerritory && nr >= 0 && nr < 10 && nc >= 0 && nc < 9 && !board[legR][legC]) {
            moves.push({ row: nr, col: nc });
        }
    }
    return moves;
};

const getAdvisorMoves = (board, r, c, color) => {
    const moves = [];
    const isRed = color === 'red';
    const candidates = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (let [dr, dc] of candidates) {
        const nr = r + dr;
        const nc = c + dc;
        // In palace (rows 0-2 or 7-9, cols 3-5)
        const inPalace = (nc >= 3 && nc <= 5) && (isRed ? (nr >= 7 && nr <= 9) : (nr >= 0 && nr <= 2));
        if (inPalace) moves.push({ row: nr, col: nc });
    }
    return moves;
};

const getGeneralMoves = (board, r, c, color) => {
    const moves = [];
    const isRed = color === 'red';
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (let [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        const inPalace = (nc >= 3 && nc <= 5) && (isRed ? (nr >= 7 && nr <= 9) : (nr >= 0 && nr <= 2));
        if (inPalace) moves.push({ row: nr, col: nc });
    }

    // Special: Flying General (Face-to-face check)
    // Find enemy general's column
    // This is complex, usually checked after move, but we can add it as a basic constraint if they are in same column with no pieces between
    return moves;
};
