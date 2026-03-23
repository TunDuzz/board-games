/**
 * Xiangqi Move Logic Utility (Backend Copy)
 */

exports.getValidMoves = (board, r, c) => {
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
        if (m.row < 0 || m.row > 9 || m.col < 0 || m.col > 8) return false;
        const target = board[m.row][m.col];
        return !target || target.color !== color;
    });
};

const getPawnMoves = (board, r, c, color) => {
    const moves = [];
    const isRed = color === 'red';
    const dir = isRed ? -1 : 1; 
    const sideRow = isRed ? 4 : 5; 

    moves.push({ row: r + dir, col: c });

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
                if (!target) moves.push({ row: nr, col: nc });
                else jumped = true;
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
    return moves;
};
