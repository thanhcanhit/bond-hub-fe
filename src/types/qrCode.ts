export interface UserData {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  fullName: string | null;
  profilePictureUrl?: string | null;
}

export interface LoginData {
  user: UserData;
  accessToken: string;
  refreshToken: string;
}

export interface QrStatusData {
  status: "PENDING" | "SCANNED" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
  userData?: UserData;
  loginData?: LoginData;
  message?: string;
}
