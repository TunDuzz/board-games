import http from '../lib/http';

export const friendService = {
    async getFriends() {
        const response = await http.get('/friends');
        return response.data;
    },

    async getPendingRequests() {
        const response = await http.get('/friends/pending');
        return response.data;
    },

    async getSentRequests() {
        const response = await http.get('/friends/sent');
        return response.data;
    },

    async searchUsers(query) {
        const response = await http.get(`/friends/search?q=${encodeURIComponent(query)}`);
        return response.data;
    },

    async sendRequest(userId) {
        const response = await http.post(`/friends/request/${userId}`);
        return response.data;
    },

    async acceptRequest(friendId) {
        const response = await http.post(`/friends/accept/${friendId}`);
        return response.data;
    },

    async rejectRequest(friendId) {
        const response = await http.post(`/friends/reject/${friendId}`);
        return response.data;
    },

    async removeFriend(friendId) {
        const response = await http.delete(`/friends/remove/${friendId}`);
        return response.data;
    },

    async blockUser(userId) {
        const response = await http.post(`/friends/block/${userId}`);
        return response.data;
    },

    async unblockUser(userId) {
        const response = await http.post(`/friends/unblock/${userId}`);
        return response.data;
    }
};
