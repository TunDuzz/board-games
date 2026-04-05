import http from '../lib/http';

export const adminService = {
    async getAllUsers() {
        const response = await http.get('/admin/users');
        return response.data;
    },

    async toggleBanUser(userId) {
        const response = await http.post('/admin/users/toggle-ban', { userId });
        return response.data;
    }
};
