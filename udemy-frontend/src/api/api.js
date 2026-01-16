import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // make sure you saved it after login/register
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


export default api;
