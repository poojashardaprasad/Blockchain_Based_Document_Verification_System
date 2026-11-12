import axios from 'axios';

// Get API base URL from Vite environment or dynamically construct from current origin
const getBaseUrl = () => {
    if (import.meta.env.VITE_API_BASE_URL) {
        return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '');
    }
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:5001/api`;
};

export const API_BASE_URL = getBaseUrl();
// Server root URL without /api (for direct routes/downloads)
export const SERVER_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Add Token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
