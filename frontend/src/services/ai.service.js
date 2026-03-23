import http from '../lib/http';

export const aiService = {
    async makeMove(gameType, boardState, validMoves = [], botRole = 'player2') {
        const response = await http.post('/ai/make-move', { gameType, boardState, validMoves, botRole });
        return response.data;
    }
};
