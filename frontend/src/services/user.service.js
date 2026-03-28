import http from '../lib/http';

export const userService = {
    async getProfile() {
        const response = await http.get('/user/profile');
        return response.data;
    },

    async updateProfile(data) {
        const response = await http.put('/user/profile', data);
        return response.data;
    },

    async getMatchHistory() {
        const response = await http.get('/user/history');
        return response.data;
    },

    async getRankings() {
        const response = await http.get('/user/rankings');
        return response.data;
    },

    async getMatchMoves(matchId) {
        const response = await http.get(`/user/match/${matchId}/moves`);
        return response.data;
    }
};
