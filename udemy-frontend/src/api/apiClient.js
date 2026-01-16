// src/api/apiClient.js
import axios from "axios";

const apiClient = axios.create({
    headers: {
        "Content-Type": "application/json",
    },
});

// Auto-add token to every request
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle response errors globally (optional)
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // If 401 Unauthorized, could redirect to login
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
            // Optionally redirect: window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;
