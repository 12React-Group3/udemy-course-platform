// src/api/auth.js
import axios from "axios";
import { API_PATHS } from "./apiPaths";

export function login(email, password) {
  return axios.post(API_PATHS.AUTH.LOGIN, { email, password });
}

export function register(formData) {
  return axios.post(API_PATHS.AUTH.REGISTER, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}
