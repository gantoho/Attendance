import { create } from 'zustand';
import type { User, Location, AttendanceRecord } from '../types';
import { commands } from '../api';

interface LoadState {
  users: boolean;
  locations: boolean;
  records: boolean;
}

interface AdminDataState {
  currentAdminId: string | null;
  users: User[];
  locations: Location[];
  records: AttendanceRecord[];
  loading: LoadState;
  loaded: LoadState;

  setAdmin: (adminId: string | null) => void;

  loadUsers: (force?: boolean) => Promise<void>;
  loadLocations: (force?: boolean) => Promise<void>;
  loadRecords: (force?: boolean) => Promise<void>;

  refreshUsers: () => Promise<void>;
  refreshLocations: () => Promise<void>;
  refreshRecords: () => Promise<void>;
}

export const useAdminDataStore = create<AdminDataState>((set, get) => ({
  currentAdminId: null,
  users: [],
  locations: [],
  records: [],
  loading: { users: false, locations: false, records: false },
  loaded: { users: false, locations: false, records: false },

  setAdmin: (adminId) => {
    const prev = get().currentAdminId;
    if (prev !== adminId) {
      set({
        currentAdminId: adminId,
        users: [],
        locations: [],
        records: [],
        loaded: { users: false, locations: false, records: false },
      });
    }
  },

  loadUsers: async (force = false) => {
    const { currentAdminId, loading, loaded } = get();
    if (!currentAdminId) return;
    if (loading.users || (loaded.users && !force)) return;
    set((s) => ({ loading: { ...s.loading, users: true } }));
    try {
      const data = await commands.getUsersByAdmin(currentAdminId);
      set((s) => ({
        users: data,
        loading: { ...s.loading, users: false },
        loaded: { ...s.loaded, users: true },
      }));
    } catch {
      set((s) => ({ loading: { ...s.loading, users: false } }));
    }
  },

  loadLocations: async (force = false) => {
    const { currentAdminId, loading, loaded } = get();
    if (!currentAdminId) return;
    if (loading.locations || (loaded.locations && !force)) return;
    set((s) => ({ loading: { ...s.loading, locations: true } }));
    try {
      const data = await commands.getLocationsByAdmin(currentAdminId);
      set((s) => ({
        locations: data,
        loading: { ...s.loading, locations: false },
        loaded: { ...s.loaded, locations: true },
      }));
    } catch {
      set((s) => ({ loading: { ...s.loading, locations: false } }));
    }
  },

  loadRecords: async (force = false) => {
    const { currentAdminId, loading, loaded } = get();
    if (!currentAdminId) return;
    if (loading.records || (loaded.records && !force)) return;
    set((s) => ({ loading: { ...s.loading, records: true } }));
    try {
      const data = await commands.getAttendanceRecordsByAdmin(currentAdminId);
      set((s) => ({
        records: data,
        loading: { ...s.loading, records: false },
        loaded: { ...s.loaded, records: true },
      }));
    } catch {
      set((s) => ({ loading: { ...s.loading, records: false } }));
    }
  },

  refreshUsers: async () => get().loadUsers(true),
  refreshLocations: async () => get().loadLocations(true),
  refreshRecords: async () => get().loadRecords(true),
}));

