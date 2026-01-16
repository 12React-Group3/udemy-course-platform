// src/api/profile.js
import axios from "axios";
import { API_PATHS } from "./apiPaths";

const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export function getProfile() {
  return axios.get(API_PATHS.AUTH.PROFILE, {
    headers: getAuthHeader(),
  });
}

export function changePassword(payload) {
  return axios.put(API_PATHS.AUTH.CHANGE_PASSWORD, payload, {
    headers: {
      ...getAuthHeader(),
      "Content-Type": "application/json",
    },
  });
}
