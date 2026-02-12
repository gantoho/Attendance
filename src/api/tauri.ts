import { invoke } from '@tauri-apps/api/core';
import type { User, Location, AttendanceRecord, LoginRequest, LoginResponse, CheckInRequest, CheckInResponse, CreateUserRequest, CreateLocationRequest, UpdateLocationRequest } from '../types';

export const commands = {
  login: (request: LoginRequest): Promise<LoginResponse> => 
    invoke('login', { request }),
  
  getAllUsers: (): Promise<User[]> => 
    invoke('get_all_users'),
  
  getUsersByAdmin: (adminId: string): Promise<User[]> => 
    invoke('get_users_by_admin', { adminId }),
  
  createUser: (user: CreateUserRequest): Promise<User> => 
    invoke('create_user', { user }),
  
  deleteUser: (userId: string): Promise<void> => 
    invoke('delete_user', { userId }),
  
  updateUserLocation: (userId: string, locationId: string): Promise<User> => 
    invoke('update_user_location', { userId, locationId }),
  
  getUserLocation: (userId: string): Promise<Location | null> => 
    invoke('get_user_location', { userId }),
  
  getAllLocations: (): Promise<Location[]> => 
    invoke('get_all_locations'),
  
  getLocationsByAdmin: (adminId: string): Promise<Location[]> => 
    invoke('get_locations_by_admin', { adminId }),
  
  createLocation: (location: CreateLocationRequest): Promise<Location> => 
    invoke('create_location', { location }),
  
  updateLocation: (locationId: string, location: UpdateLocationRequest): Promise<Location> => 
    invoke('update_location', { locationId, location }),
  
  deleteLocation: (locationId: string): Promise<void> => 
    invoke('delete_location', { locationId }),
  
  getAttendanceRecords: (userId?: string): Promise<AttendanceRecord[]> => 
    invoke('get_attendance_records', { userId }),
  
  getAttendanceRecordsByAdmin: (adminId: string): Promise<AttendanceRecord[]> => 
    invoke('get_attendance_records_by_admin', { adminId }),
  
  checkIn: (request: CheckInRequest): Promise<CheckInResponse> => 
    invoke('check_in', { request }),
  
  getCurrentLocation: (): Promise<{ latitude: number; longitude: number }> => 
    invoke('get_current_location'),
};
