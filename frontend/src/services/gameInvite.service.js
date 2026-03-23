import http from '../lib/http';

export const gameInviteService = {
    async getReceivedInvites() {
        const response = await http.get('/invites/received');
        return response.data;
    },

    async getSentInvites() {
        const response = await http.get('/invites/sent');
        return response.data;
    },

    async sendInvite(toUserId, roomId) {
        const response = await http.post('/invites/send', { to_user_id: toUserId, room_id: roomId });
        return response.data;
    },

    async acceptInvite(inviteId) {
        const response = await http.post(`/invites/accept/${inviteId}`);
        return response.data;
    },

    async rejectInvite(inviteId) {
        const response = await http.post(`/invites/reject/${inviteId}`);
        return response.data;
    },

    async cancelInvite(inviteId) {
        const response = await http.delete(`/invites/cancel/${inviteId}`);
        return response.data;
    }
};
