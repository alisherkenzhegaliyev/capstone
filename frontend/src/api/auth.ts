import { apiClient } from "./client";


export type AuthUser = {
  id: number;
  email: string;
};

type LoginResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};


export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post("/auth/login", { email, password });
  return response.data;
}


export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await apiClient.get("/auth/me");
  return response.data;
}
