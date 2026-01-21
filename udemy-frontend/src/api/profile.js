// src/api/profile.js
import apiClient from "./apiClient";
import { API_PATHS } from "./apiPaths";

export function getProfile() {
    return apiClient.get(API_PATHS.AUTH.PROFILE);
}

export function changePassword(payload) {
    return apiClient.put(API_PATHS.AUTH.CHANGE_PASSWORD, payload);
}

export function updateProfile(payload) {
    return apiClient.put(API_PATHS.AUTH.PROFILE, payload);
}

export function uploadAvatar(formData) {
    return apiClient.post(API_PATHS.AUTH.UPLOAD_AVATAR, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
}
