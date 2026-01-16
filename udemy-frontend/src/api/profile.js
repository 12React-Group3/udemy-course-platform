// src/api/profile.js
import api from "./api";

export function getProfile() {
  return api.get("/auth/profile");     
}

export function changePassword(payload) {
  return api.put("/auth/change-password", payload);
}
