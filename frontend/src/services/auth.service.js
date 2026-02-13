import http from '../lib/http';

export const authService = {
    async login(email, password) {
        const response = await http.post('/auth/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    async register(username, email, password) {
        const response = await http.post('/auth/register', { username, email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Optional: Redirect to login page or reload
        // window.location.href = '/login'; 
    },

    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                return null; // Invalid user data
            }
        }
        return null;
    },

    isAuthenticated() {
        return !!localStorage.getItem('token');
    }
};
