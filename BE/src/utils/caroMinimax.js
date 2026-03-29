/**
 * Thuật toán Minimax + Alpha-Beta Pruning dành cho game Caro (Gomoku)
 * Grid 15x15
 */

const BOARD_SIZE = 15;

// Điểm số đánh giá cho chuỗi
const WIN_SCORE = 100000000;
const SCORE_TABLE = {
    5: 10000000,   // 5 quân - Thắng
    4: 10000,      // 4 quân liên tục mở 2 đầu
    3: 1000,       // 3 quân mở 2 đầu
    2: 100,        // 2 quân
    1: 10          // 1 quân
};

// Điểm chặn (khi đối thủ có chuỗi)
const BLOCK_SCORE = {
    4: 1000000,    // Chặn 4 quân đối thủ cực kỳ khẩn cấp
    3: 5000,       // Chặn 3 quân
    2: 500
};

/**
 * Tìm nước đi tốt nhất
 */
exports.getBestCaroMove = (movesHistory, botColor = 'White', difficulty = 'medium') => {
    // 1. Dựng lại bàn cờ 2D
    const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    movesHistory.forEach(m => {
        if (m.y >= 0 && m.y < BOARD_SIZE && m.x >= 0 && m.x < BOARD_SIZE) {
            board[m.y][m.x] = m.color.toLowerCase(); // 'black' hoặc 'white'
        }
    });

    const bot = botColor.toLowerCase();
    const opponent = bot === 'white' ? 'black' : 'white';

    // 2. Tìm các ô trống có thể đánh (gần các quân đã đánh)
    const possibleMoves = getCandidateMoves(board);
    if (possibleMoves.length === 0) {
        // Bàn cờ trống, đánh ở giữa
        return { x: 7, y: 7 };
    }

    let bestMove = possibleMoves[0];
    let bestScore = -Infinity;
    
    // Cấp độ khó tương ứng với độ sâu Minimax
    let depth = 2; 
    if (difficulty === 'easy') depth = 1;
    else if (difficulty === 'hard') depth = 3;

    for (const move of possibleMoves) {
        // Giả lập đánh thử
        board[move.y][move.x] = bot;
        
        // Alpha-Beta
        const score = minimax(board, depth - 1, false, -Infinity, Infinity, bot, opponent);
        
        // Hoàn tác
        board[move.y][move.x] = null;

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
};

/**
 * Thuật toán Minimax đệ quy kèm Alpha-Beta
 */
function minimax(board, depth, isMaximizing, alpha, beta, bot, opponent) {
    if (depth === 0) {
        return evaluateBoard(board, bot, opponent);
    }

    const candidateMoves = getCandidateMoves(board);
    if (candidateMoves.length === 0) return 0;

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of candidateMoves) {
            board[move.y][move.x] = bot;
            const ev = minimax(board, depth - 1, false, alpha, beta, bot, opponent);
            board[move.y][move.x] = null;
            maxEval = Math.max(maxEval, ev);
            alpha = Math.max(alpha, ev);
            if (beta <= alpha) break; // Pruning
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of candidateMoves) {
            board[move.y][move.x] = opponent;
            const ev = minimax(board, depth - 1, true, alpha, beta, bot, opponent);
            board[move.y][move.x] = null;
            minEval = Math.min(minEval, ev);
            beta = Math.min(beta, ev);
            if (beta <= alpha) break; // Pruning
        }
        return minEval;
    }
}

/**
 * Thu hẹp vùng tìm kiếm: Chỉ tìm các ô trống bao quanh các quân đã đánh trong bán kính 1-2 ô
 */
function getCandidateMoves(board) {
    const candidates = new Map();
    const directions = [
        [-1,0],[1,0],[0,-1],[0,1],
        [-1,-1],[1,1],[-1,1],[1,-1]
    ];

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] !== null) {
                // Có quân ở đây, duyệt 8 hướng xung quanh nó
                for (const [dr, dc] of directions) {
                    for (let step = 1; step <= 1; step++) { // R bán kính 1 ô
                        const nr = r + dr * step;
                        const nc = c + dc * step;
                        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === null) {
                            candidates.set(`${nr},${nc}`, { y: nr, x: nc });
                        }
                    }
                }
            }
        }
    }
    return Array.from(candidates.values());
}

/**
 * Hàm lượng giá (Evaluation Function) tổng quan bàn cờ
 */
function evaluateBoard(board, bot, opponent) {
    let score = 0;

    // Hướng duyệt: Ngang, Dọc, 2 Chéo
    score += evaluateLineDirections(board, bot, opponent);

    return score;
}

function evaluateLineDirections(board, bot, opponent) {
    let totalScore = 0;

    // 4 hướng quét: Ngang, Dọc, Chéo 1, Chéo 2
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            totalScore += scoreAtPoint(board, r, c, 0, 1, bot, opponent); // Ngang
            totalScore += scoreAtPoint(board, r, c, 1, 0, bot, opponent); // Dọc
            totalScore += scoreAtPoint(board, r, c, 1, 1, bot, opponent); // Chéo xuống
            totalScore += scoreAtPoint(board, r, c, 1, -1, bot, opponent);// Chéo lên
        }
    }
    return totalScore;
}

/**
 * Tính điểm cho 1 hướng di chuyển từ 1 điểm (r, c)
 */
function scoreAtPoint(board, r, c, dr, dc, bot, opponent) {
    let botCount = 0;
    let oppCount = 0;

    for (let i = 0; i < 5; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
            const cell = board[nr][nc];
            if (cell === bot) botCount++;
            else if (cell === opponent) oppCount++;
        } else {
            return 0; // Vượt biên, không đủ 5 ô tuyến
        }
    }

    // Không thể tạo 5 nếu cả 2 quân đều nằm trong tuyến 5 ô
    if (botCount > 0 && oppCount > 0) return 0;

    if (botCount > 0) {
        if (botCount === 5) return WIN_SCORE;
        return SCORE_TABLE[botCount] || 0;
    }

    if (oppCount > 0) {
        if (oppCount === 5) return -WIN_SCORE;
        // Chặn oppCount
        return -BLOCK_SCORE[oppCount] || -SCORE_TABLE[oppCount] || 0;
    }

    return 0;
}
