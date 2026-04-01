import http from '../lib/http';

export const roomService = {
    async createRoom(gameTypeName, password = null, is_private = false) {
        const response = await http.post('/rooms/create', { gameTypeName, password, is_private });
        return response.data;
    },

    async joinRoom(roomIdOrCode, password = null, gameTypeName = null) {
        const response = await http.post('/rooms/join', { roomIdOrCode, password, gameTypeName });
        return response.data;
    },

    async quickJoin(gameTypeName) {
        const response = await http.post('/rooms/quick-join', { gameTypeName });
        return response.data;
    },

    getRoomsByGameType(gameTypeName) {
        return http.get(`/rooms/game/${gameTypeName}`).then(res => res.data);
    },

    getMyRooms() {
        return http.get('/rooms/my-rooms').then(res => res.data);
    }
};
