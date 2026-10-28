export type TaskPriority = "Low" | "Medium" | "High";

export interface Task {
  id: string;
  userId: string;
  title: string;
  status: "To Do" | "In Progress" | "Completed";
  description: string | null;
  completed: boolean;
  dueAt: string | null;
  priority: TaskPriority;
  category: string;
  reminderEnabled: boolean;
  reminderAt: string | null;
  reminderChannelIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TasksResponse {
  tasks: Task[];
}

export interface TaskResponse {
  task: Task;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueAt?: string;
  priority?: TaskPriority;
  category?: string;
  reminderEnabled?: boolean;
  reminderAt?: string;
  reminderChannelIds?: string[];
}
export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  completed?: boolean;
  status?: "To Do" | "In Progress" | "Completed";
  dueAt?: string | null;
  priority?: string;
  category?: string;
  reminderEnabled?: boolean;
  reminderAt?: string | null;
  reminderChannelIds?: string[];
};