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

    async getMatchHistory(gameType) {
        const params = gameType ? { gameType } : {};
        const response = await http.get('/user/history', { params });
        return response.data;
    },


    async getRankings(gameType) {
        const params = gameType ? { gameType } : {};
        const response = await http.get('/user/rankings', { params });
        return response.data;
    },


    async getMatchMoves(matchId) {
        const response = await http.get(`/user/match/${matchId}/moves`);
        return response.data;
    },

    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append('avatar', file);
        const response = await http.post('/user/upload-avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    }
};
