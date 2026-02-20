import type { User, Location, AttendanceRecord, LoginRequest, LoginResponse, CheckInRequest, CheckInResponse, CreateUserRequest, CreateLocationRequest, UpdateLocationRequest } from '../types';

function getBaseUrl() {
  // Priority: Vite env -> localStorage -> empty
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (import.meta as any)?.env;
  const fromEnv = env?.VITE_SERVER_BASE_URL;
  const fromStorage = localStorage.getItem('server_base_url');
  // Persist env config into localStorage to keep backend selection stable across restarts
  if (fromEnv && fromEnv !== fromStorage) {
    try {
      localStorage.setItem('server_base_url', fromEnv);
    } catch {}
  }
  return fromEnv || fromStorage || '';
}

async function http<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  if (!base) throw new Error('SERVER_BASE_URL 未配置');
  const res = await fetch(`${base}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const httpCommands = {
  login: (request: LoginRequest): Promise<LoginResponse> =>
    http<LoginResponse>('/login', { method: 'POST', body: JSON.stringify(request) }),

  getAllUsers: (): Promise<User[]> =>
    http<User[]>('/users'),

  getUsersByAdmin: (adminId: string): Promise<User[]> =>
    http<User[]>(`/users?adminId=${encodeURIComponent(adminId)}`),

  createUser: (user: CreateUserRequest): Promise<User> =>
    http<User>('/users', { method: 'POST', body: JSON.stringify(user) }),

  deleteUser: (userId: string): Promise<void> =>
    http<void>(`/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }),

  updateUserLocation: (userId: string, locationId: string): Promise<User> =>
    http<User>(`/users/${encodeURIComponent(userId)}/location`, {
      method: 'PATCH',
      body: JSON.stringify({ locationId }),
    }),

  getUserLocation: (userId: string): Promise<Location | null> =>
    http<Location | null>(`/users/${encodeURIComponent(userId)}/location`),

  getAllLocations: (): Promise<Location[]> =>
    http<Location[]>('/locations'),

  getLocationsByAdmin: (adminId: string): Promise<Location[]> =>
    http<Location[]>(`/locations?adminId=${encodeURIComponent(adminId)}`),

  createLocation: (location: CreateLocationRequest): Promise<Location> =>
    http<Location>('/locations', { method: 'POST', body: JSON.stringify(location) }),

  updateLocation: (locationId: string, location: UpdateLocationRequest): Promise<Location> =>
    http<Location>(`/locations/${encodeURIComponent(locationId)}`, {
      method: 'PATCH',
      body: JSON.stringify(location),
    }),

  deleteLocation: (locationId: string): Promise<void> =>
    http<void>(`/locations/${encodeURIComponent(locationId)}`, { method: 'DELETE' }),

  getAttendanceRecords: (userId?: string): Promise<AttendanceRecord[]> =>
    userId
      ? http<AttendanceRecord[]>(`/records?userId=${encodeURIComponent(userId)}`)
      : http<AttendanceRecord[]>('/records'),

  getAttendanceRecordsByAdmin: (adminId: string): Promise<AttendanceRecord[]> =>
    http<AttendanceRecord[]>(`/records/admin/${encodeURIComponent(adminId)}`),

  checkIn: (request: CheckInRequest): Promise<CheckInResponse> =>
    http<CheckInResponse>('/checkin', { method: 'POST', body: JSON.stringify(request) }),

  getCurrentLocation: (): Promise<{ latitude: number; longitude: number }> =>
    Promise.reject(new Error('请使用前端浏览器地理位置 API')),
};
