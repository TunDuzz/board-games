import http from '../lib/http';

export const aiService = {
    async makeMove(gameType, boardState, validMoves = [], botRole = 'player2', difficulty = 'medium') {
        const response = await http.post('/ai/make-move', { gameType, boardState, validMoves, botRole, difficulty });
        return response.data;
    },
    async analyzePosition(gameType, boardState, turn, movesHistory = []) {
        const response = await http.post('/ai/analyze', { gameType, boardState, turn, movesHistory });
        return response.data;
    }
};

