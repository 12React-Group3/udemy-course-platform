// src/api/profile.js
import apiClient from "./apiClient";
import { API_PATHS } from "./apiPaths";

export function getProfile() {
    return apiClient.get(API_PATHS.AUTH.PROFILE);
}

export function changePassword(payload) {
    return apiClient.put(API_PATHS.AUTH.CHANGE_PASSWORD, payload);
}
