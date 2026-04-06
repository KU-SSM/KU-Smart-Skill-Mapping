import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: `${API_BASE_URL}/`,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    if (
        config.method?.toLowerCase() === 'post' &&
        (config.data === undefined || config.data === null)
    ) {
        delete config.headers['Content-Type'];
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
            console.error('Network Error:', {
                message: error.message,
                code: error.code,
                config: error.config,
            });
            error.message = 'Network Error: Unable to connect to the server. Please check if the backend is running.';
        } else if (error.response) {
            console.error('API Error Response:', {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data,
                url: error.config?.url,
            });
        } else if (error.request) {
            console.error('No Response Received:', {
                request: error.request,
                url: error.config?.url,
            });
            error.message = 'No response from server. Please check if the backend is running.';
        }
        return Promise.reject(error);
    }
);

export default api;