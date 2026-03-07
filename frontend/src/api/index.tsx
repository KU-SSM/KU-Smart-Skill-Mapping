import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: `${API_BASE_URL}/`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to remove Content-Type for FormData
api.interceptors.request.use((config) => {
    // If the data is FormData, remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response interceptor for better error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
            console.error('Network Error:', {
                message: error.message,
                code: error.code,
                config: error.config,
            });
            // Provide a more helpful error message
            error.message = 'Network Error: Unable to connect to the server. Please check if the backend is running.';
        } else if (error.response) {
            // Server responded with error status
            console.error('API Error Response:', {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data,
                url: error.config?.url,
            });
        } else if (error.request) {
            // Request was made but no response received
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