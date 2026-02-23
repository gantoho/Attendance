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

function normalizeBaseUrl(raw: string): string {
  if (!raw) return raw;
  let input = raw.trim();
  if (!/^https?:\/\//i.test(input)) {
    input = `http://${input}`;
  }
  const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '') || '';
  const emulatorGateway = localStorage.getItem('emulator_gateway') || '10.0.2.2';
  try {
    const u = new URL(input);
    const isLocal =
      u.hostname === 'localhost' ||
      u.hostname === '127.0.0.1' ||
      u.hostname === '::1';
    const isAndroid = /Android/i.test(ua);
    if (isAndroid && isLocal) {
      u.hostname = emulatorGateway;
      return u.toString().replace(/\/+$/, '');
    }
    return u.toString().replace(/\/+$/, '');
  } catch {
    // Fallback: simple regex replace
    if (/Android/i.test(ua) && /(localhost|127\.0\.0\.1)/i.test(input)) {
      return input.replace(/localhost|127\.0\.0\.1/i, emulatorGateway).replace(/\/+$/, '');
    }
    return input.replace(/\/+$/, '');
  }
}

async function http<T>(path: string, options?: RequestInit): Promise<T> {
  const base = normalizeBaseUrl(getBaseUrl());
  if (!base) throw new Error('SERVER_BASE_URL 未配置');
  const res = await fetch(`${base}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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
