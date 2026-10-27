import { ApiErrorShape } from "../types/common";


export interface RequestConfig {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeout?: number;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(error: ApiErrorShape, status: number) {
    super(error.error);
    this.code = error.code;
    this.status = status;
    this.details = error.details;
    this.name = "ApiError";
  }
}
