export interface ApiUser {
    id: string;
    name?: string;
    email: string;
    timezone?: string;
  }
  
  export interface AuthResponse {
    message: string;
    user: ApiUser;
  }
  
  export interface CurrentUserResponse {
    user: ApiUser;
  }