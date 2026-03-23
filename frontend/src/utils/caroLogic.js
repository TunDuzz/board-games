/**
 * Caro (Gomoku) 15x15 Logic Utility
 */

export const BOARD_SIZE = 15;

export const checkWin = (board, r, c, color) => {
    const directions = [
        [0, 1],  // Ngang
        [1, 0],  // Dọc
        [1, 1],  // Chéo xuôi
        [1, -1]  // Chéo ngược
    ];

    for (const [dr, dc] of directions) {
        let count = 1;

        // Hướng xuôi
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc]?.color === color) {
            count++;
            nr += dr;
            nc += dc;
        }

        // Hướng ngược
        nr = r - dr;
        nc = c - dc;
        while (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc]?.color === color) {
            count++;
            nr -= dr;
            nc -= dc;
        }

        if (count >= 5) return true;
    }
    return false;
};

export const checkDraw = (board) => {
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (!board[r][c]) return false;
        }
    }
    return true;
};

export const getWinningLine = (board, r, c, color) => {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

    for (const [dr, dc] of directions) {
        let line = [{ row: r, col: c }];

        // Hướng xuôi
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc]?.color === color) {
            line.push({ row: nr, col: nc });
            nr += dr;
            nc += dc;
        }

        // Hướng ngược
        nr = r - dr;
        nc = c - dc;
        while (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc]?.color === color) {
            line.push({ row: nr, col: nc });
            nr -= dr;
            nc -= dc;
        }

        if (line.length >= 5) return line;
    }
    return [];
};
