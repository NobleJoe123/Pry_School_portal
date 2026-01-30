// src/services/api.ts

import axios from 'axios';

const api = axios.create({
    baseURL: 'http://12.0.0.1:8000/api',
    withCredentials: true,
});

export default api;