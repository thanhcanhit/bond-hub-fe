//types/auth.ts
export interface User {
  id: number;
  phoneNumber: string;
}

export interface AuthResponse {
  accessToken: string;
  user?: User;
}

export interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (accessToken: string, user: User) => void;
  login: (credentials: {
    phoneNumber: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
}
