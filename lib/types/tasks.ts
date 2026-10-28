export interface Task {
    id: string;
    userId: string;
    title: string;
    description: string | null;
    completed: boolean;
    dueAt: string | null;
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
  }
  
  export interface UpdateTaskInput {
    title?: string;
    completed?: boolean;
  }