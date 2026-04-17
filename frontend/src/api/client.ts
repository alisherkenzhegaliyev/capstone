import axios from "axios";
import { getStoredToken } from "../lib/auth";


export const API_BASE = "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE,
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
