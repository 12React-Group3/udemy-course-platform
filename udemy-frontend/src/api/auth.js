// src/api/auth.js
import apiClient from "./apiClient";
import { API_PATHS } from "./apiPaths";

export function login(email, password) {
    return apiClient.post(API_PATHS.AUTH.LOGIN, { email, password });
}

export function register(formData) {
    return apiClient.post(API_PATHS.AUTH.REGISTER, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
}

export function logout() {
    localStorage.removeItem("token");
}
