import axios, { AxiosInstance, AxiosError } from "axios";
import { getBaseUrl } from "../api/config";
import { ApiError } from "../api/types";
import type { ApiErrorShape } from "../types/common";

const DEFAULT_TIMEOUT = 120_000;

const axiosInstance: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: DEFAULT_TIMEOUT,
  withCredentials: false,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorShape>) => {
    if (error.response?.data) {
      throw new ApiError(error.response.data, error.response.status);
    }
    throw new ApiError(
      {
        error: error.message ?? "Network error",
        code: "NETWORK_ERROR",
      },
      error.response?.status ?? 0
    );
  }
);

export const apiClient = {
  async get<T>(path: string, config?: { signal?: AbortSignal }): Promise<T> {
    const response = await axiosInstance.get<T>(path, config);
    return response.data;
  },
  async post<T>(path: string, body?: unknown, config?: { signal?: AbortSignal }): Promise<T> {
    const response = await axiosInstance.post<T>(path, body, config);
    return response.data;
  },
  async patch<T>(path: string, body?: unknown, config?: { signal?: AbortSignal }): Promise<T> {
    const response = await axiosInstance.patch<T>(path, body, config);
    return response.data;
  },
  async del<T = void>(path: string, config?: { signal?: AbortSignal }): Promise<T> {
    const response = await axiosInstance.delete<T>(path, config);
    return response.data;
  },
};
