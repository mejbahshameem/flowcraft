export interface User {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface MessageResponse {
  sucess?: boolean;
  success?: boolean;
  message?: string;
}
