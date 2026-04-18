import axios from "axios";
import { apiClient } from "./client";


export type AuthUser = {
  id: number;
  email: string;
};

export type AuthSuccessResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export type SignUpResponse = {
  message: string;
  email: string;
};

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}


export async function login(email: string, password: string): Promise<AuthSuccessResponse> {
  try {
    const response = await apiClient.post("/auth/login", { email, password });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Invalid email or password."));
  }
}

export async function signUp(email: string, password: string): Promise<SignUpResponse> {
  try {
    const response = await apiClient.post("/auth/signup", { email, password });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to create account."));
  }
}

export async function verifyEmail(
  email: string,
  code: string,
): Promise<AuthSuccessResponse> {
  try {
    const response = await apiClient.post("/auth/verify-email", { email, code });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Invalid verification code."));
  }
}


export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await apiClient.get("/auth/me");
  return response.data;
}
