import axios from 'axios';

// Use current hostname (works for localhost AND local network IP)
const hostname = window.location.hostname;
const api = axios.create({
    baseURL: `http://${hostname}:5001/api`,
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
