export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  adminId?: string | null;
  locationId?: string | null;
  createTime?: string | null;
  updateTime?: string | null;
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
  createTime?: string | null;
  updateTime?: string | null;
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
  /** 打卡类型：in 上班卡 / out 下班卡（openapi 契约字段 recordType） */
  recordType?: 'in' | 'out';
  errorMessage?: string;
  createTime?: string | null;
  updateTime?: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  message?: string;
  token?: string;
}

export interface CheckInRequest {
  user_id: string;
  /** 打卡类型：in 上班卡 / out 下班卡（openapi 契约必填字段 record_type） */
  record_type: 'in' | 'out';
  latitude: number;
  longitude: number;
}

export interface CheckInResponse {
  success: boolean;
  record?: AttendanceRecord;
  message?: string;
}
