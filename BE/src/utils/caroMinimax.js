/**
 * Thuật toán Minimax + Alpha-Beta Pruning dành cho game Caro (Gomoku)
 * Grid 15x15 - Nâng cấp evaluation function (Dễ / Trung bình / Khó)
 */

const BOARD_SIZE = 15;
const WIN_SCORE = 100000000;

/**
 * Tìm nước đi tốt nhất
 */
exports.getBestCaroMove = (movesHistory, botColor = 'White', difficulty = 'medium') => {
    const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    movesHistory.forEach(m => {
        if (m.y >= 0 && m.y < BOARD_SIZE && m.x >= 0 && m.x < BOARD_SIZE) {
            board[m.y][m.x] = m.color.toLowerCase();
        }
    });

    const bot = botColor.toLowerCase();
    const opponent = bot === 'white' ? 'black' : 'white';

    const possibleMoves = getCandidateMoves(board);
    if (possibleMoves.length === 0) return { x: 7, y: 7 };

    // Easy: random trong top moves, depth 1
    // Medium: depth 2, full evaluation
    // Hard: depth 3-4, wider candidate radius, full evaluation
    let depth = 2;
    let randomFactor = 0;
    if (difficulty === 'easy') { depth = 1; randomFactor = 0.5; }
    else if (difficulty === 'hard') { depth = 3; }

    // Sắp xếp theo điểm heuristic trước để alpha-beta hiệu quả hơn
    const scoredMoves = possibleMoves.map(move => {
        board[move.y][move.x] = bot;
        const s = evaluateBoard(board, bot, opponent);
        board[move.y][move.x] = null;
        return { move, score: s };
    }).sort((a, b) => b.score - a.score);

    // Với độ khó dễ, chỉ xét top 8 moves để tránh luôn chọn nước tốt nhất
    const movesToEval = difficulty === 'easy'
        ? scoredMoves.slice(0, Math.min(8, scoredMoves.length))
        : scoredMoves.slice(0, Math.min(20, scoredMoves.length));

    let bestMove = movesToEval[0].move;
    let bestScore = -Infinity;

    for (const { move } of movesToEval) {
        board[move.y][move.x] = bot;
        let score = minimax(board, depth - 1, false, -Infinity, Infinity, bot, opponent);
        board[move.y][move.x] = null;

        // Dễ: thêm nhiễu ngẫu nhiên để bot đôi khi không chọn nước tối ưu
        if (difficulty === 'easy') {
            score += (Math.random() - 0.5) * 5000 * randomFactor;
        }
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return { move: bestMove, score: bestScore };
};

function minimax(board, depth, isMaximizing, alpha, beta, bot, opponent) {
    if (depth === 0) return evaluateBoard(board, bot, opponent);

    const candidates = getCandidateMovesLimited(board, depth);
    if (candidates.length === 0) return 0;

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of candidates) {
            board[move.y][move.x] = bot;
            const ev = minimax(board, depth - 1, false, alpha, beta, bot, opponent);
            board[move.y][move.x] = null;
            maxEval = Math.max(maxEval, ev);
            alpha = Math.max(alpha, ev);
            if (beta <= alpha) break;
            if (ev >= WIN_SCORE) break;  // thắng rồi không cần xét tiếp
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of candidates) {
            board[move.y][move.x] = opponent;
            const ev = minimax(board, depth - 1, true, alpha, beta, bot, opponent);
            board[move.y][move.x] = null;
            minEval = Math.min(minEval, ev);
            beta = Math.min(beta, ev);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

/**
 * Candidate moves trong bán kính 2 ô (tốt hơn bán kính 1)
 */
function getCandidateMoves(board) {
    const candidates = new Map();
    const RADIUS = 2;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] !== null) {
                for (let dr = -RADIUS; dr <= RADIUS; dr++) {
                    for (let dc = -RADIUS; dc <= RADIUS; dc++) {
                        const nr = r + dr, nc = c + dc;
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
 * Trong minimax đệ quy, dùng bán kính nhỏ hơn để giữ performance
 */
function getCandidateMovesLimited(board, depth) {
    const candidates = new Map();
    const RADIUS = depth >= 2 ? 2 : 1;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] !== null) {
                for (let dr = -RADIUS; dr <= RADIUS; dr++) {
                    for (let dc = -RADIUS; dc <= RADIUS; dc++) {
                        const nr = r + dr, nc = c + dc;
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
 * Hàm đánh giá nâng cấp: Tính điểm dựa trên pattern chuỗi có đầu mở/đóng
 */
function evaluateBoard(board, bot, opponent) {
    let score = 0;
    const DIRECTIONS = [[0,1],[1,0],[1,1],[1,-1]];
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            for (const [dr, dc] of DIRECTIONS) {
                score += evaluateLine(board, r, c, dr, dc, bot, opponent);
            }
        }
    }
    return score;
}

/**
 * Đánh giá một đoạn thẳng từ (r,c) với hướng (dr,dc)
 * Phân biệt: đầu mở/đóng - chuỗi mở 2 đầu nguy hiểm hơn nhiều
 */
function evaluateLine(board, r, c, dr, dc, bot, opponent) {
    let score = 0;

    // Đánh giá cho bot
    score += scoreSequence(board, r, c, dr, dc, bot, opponent);
    // Đánh giá cho đối thủ (để chặn)
    score -= scoreSequence(board, r, c, dr, dc, opponent, bot) * 1.1; // * 1.1: ưu tiên chặn

    return score;
}

function scoreSequence(board, r, c, dr, dc, player, opp) {
    // Đếm quân liên tiếp của 'player' bắt đầu từ (r,c)
    let count = 0, score = 0;
    let openEnds = 0;

    // Kiểm tra đầu phía sau
    const prevR = r - dr, prevC = c - dc;
    const backOpen = (prevR < 0 || prevR >= BOARD_SIZE || prevC < 0 || prevC >= BOARD_SIZE)
        ? false : board[prevR][prevC] === null;

    for (let i = 0; i < 5; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) break;
        const cell = board[nr][nc];
        if (cell === player) count++;
        else if (cell === null) { openEnds++; break; }
        else break; // bị chặn
    }

    if (count === 0) return 0;
    if (backOpen) openEnds++;

    // Tính điểm theo chuỗi và số đầu mở
    if (count >= 5) return WIN_SCORE;
    if (count === 4) {
        if (openEnds === 2) return 50000;   // 4 mở 2 đầu - gần như thắng
        if (openEnds === 1) return 10000;   // 4 mở 1 đầu
        return 100;
    }
    if (count === 3) {
        if (openEnds === 2) return 5000;    // 3 mở 2 đầu - rất nguy hiểm
        if (openEnds === 1) return 500;
        return 50;
    }
    if (count === 2) {
        if (openEnds === 2) return 200;
        if (openEnds === 1) return 50;
        return 10;
    }
    if (count === 1 && openEnds === 2) return 20;
    return 0;
}
