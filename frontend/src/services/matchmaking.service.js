import http from '../lib/http';

export const matchmakingService = {
    async joinQueue(gameTypeName) {
        const response = await http.post('/matchmaking/join', { gameTypeName });
        return response.data;
    },

    async checkStatus() {
        const response = await http.get('/matchmaking/status');
        return response.data;
    },

    async cancelQueue() {
        const response = await http.delete('/matchmaking/cancel');
        return response.data;
    }
};
