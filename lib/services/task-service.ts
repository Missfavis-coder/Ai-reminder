import { apiClient } from "@/lib/api";
import{
  CreateTaskInput,
  Task,
  TasksResponse,
  TaskResponse,
  UpdateTaskInput,
} from "../types/tasks";

export const taskService = {
  async getAll(signal?: AbortSignal): Promise<Task[]> {
    const response = await apiClient.get<TasksResponse>(
      "/api/tasks",
      { signal },
    );

    return response.tasks;
  },

  async create(input: CreateTaskInput): Promise<Task> {
    const response = await apiClient.post<TaskResponse>(
      "/api/tasks",
      input,
    );

    return response.task;
  },

  async update(
    id: string,
    input: UpdateTaskInput,
  ): Promise<Task> {
    const response = await apiClient.patch<TaskResponse>(
      `/api/tasks/${id}`,
      input,
    );

    return response.task;
  },

  delete(id: string) {
    return apiClient.del<{ message: string }>(
      `/api/tasks/${id}`,
    );
  },
};