
import { apiClient } from "@/lib/api";
import type {
  AuthResponse,
  CurrentUserResponse,
} from "@/lib/types/auth";
import { ApiMessageResponse } from "../types/api";

export const authService = {
  getCurrentUser(signal?: AbortSignal) {
    return apiClient.get<CurrentUserResponse>(
      "/api/auth/me",
      { signal },
    );
  },

  login(input: { email: string; password: string }) {
    return apiClient.post<AuthResponse>(
      "/api/auth/login",
      input,
    );
  },

  register(input: {name: string; email: string; password: string }) {
    return apiClient.post<AuthResponse>(
      "/api/auth/register",
      input,
    );
  },

  logout() {
    return apiClient.post<ApiMessageResponse>(
      "/api/auth/logout",
    );
  },
};
