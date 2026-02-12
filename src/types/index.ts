export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  adminId?: string;
  locationId?: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: UserRole;
  adminId?: string;
}

export interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  adminId: string;
}

export interface CreateLocationRequest {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  adminId: string;
}

export interface UpdateLocationRequest {
  name?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  locationId: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  status: 'success' | 'failed';
  errorMessage?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  message?: string;
}

export interface CheckInRequest {
  user_id: string;
  latitude: number;
  longitude: number;
}

export interface CheckInResponse {
  success: boolean;
  record?: AttendanceRecord;
  message?: string;
}
