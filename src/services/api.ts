import axios from 'axios';
import type {
  AuthResponse,
  Room,
  Sensor,
  SensorData,
  SensorIngestResponse,
  Anomaly,
  Alert,
  AIReport,
  AdminDashboardStats,
  RoomComparison,
  SystemHealth,
  User,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smart_hostel_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API Methods
export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post('/api/auth/login', { email, password });
    return res.data;
  },
  register: async (data: { name: string; email: string; password: string; role_name?: string; room_id?: number }) => {
    const res = await api.post('/api/auth/register', data);
    return res.data;
  },
  me: async (): Promise<User> => {
    const res = await api.get('/api/auth/me');
    return res.data;
  },
  refresh: async (): Promise<AuthResponse> => {
    const res = await api.post('/api/auth/refresh');
    return res.data;
  },
  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      localStorage.removeItem('smart_hostel_token');
      localStorage.removeItem('smart_hostel_user');
    }
  },
};

export const sensorService = {
  ingest: async (payload: {
    room_id: number;
    temperature: number;
    humidity: number;
    light: number;
    motion: number;
    air_quality?: number;
    is_simulated?: boolean;
  }): Promise<SensorIngestResponse> => {
    const res = await api.post('/api/sensor-data', payload);
    return res.data;
  },
  getLatest: async (roomId: number): Promise<SensorData> => {
    const res = await api.get(`/api/sensor-data/latest/${roomId}`);
    return res.data;
  },
  getHistory: async (roomId: number, limit = 30): Promise<SensorData[]> => {
    const res = await api.get(`/api/sensor-data/history/${roomId}`, { params: { limit } });
    return res.data;
  },
  getAll: async (roomId?: number, limit = 50): Promise<SensorData[]> => {
    const res = await api.get('/api/sensor-data', { params: { room_id: roomId, limit } });
    return res.data;
  },
};

export const roomService = {
  getAll: async (): Promise<Room[]> => {
    const res = await api.get('/api/rooms');
    return res.data;
  },
  getById: async (id: number): Promise<Room> => {
    const res = await api.get(`/api/rooms/${id}`);
    return res.data;
  },
  create: async (data: { room_number: string; block: string; floor: number; status?: string }): Promise<Room> => {
    const res = await api.post('/api/rooms', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Room>): Promise<Room> => {
    const res = await api.put(`/api/rooms/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/api/rooms/${id}`);
    return res.data;
  },
};

export const hardwareSensorService = {
  getAll: async (): Promise<Sensor[]> => {
    const res = await api.get('/api/sensors');
    return res.data;
  },
  create: async (data: { room_id: number; sensor_type: string; device_id: string; status?: string }): Promise<Sensor> => {
    const res = await api.post('/api/sensors', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Sensor>): Promise<Sensor> => {
    const res = await api.put(`/api/sensors/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/api/sensors/${id}`);
    return res.data;
  },
};

export const anomalyService = {
  getAll: async (params?: { room_id?: number; status_filter?: string; limit?: number }): Promise<Anomaly[]> => {
    const res = await api.get('/api/anomalies', { params });
    return res.data;
  },
  getById: async (id: number): Promise<Anomaly> => {
    const res = await api.get(`/api/anomalies/${id}`);
    return res.data;
  },
  resolve: async (id: number, status = 'RESOLVED'): Promise<Anomaly> => {
    const res = await api.put(`/api/anomalies/${id}/resolve`, { status });
    return res.data;
  },
};

export const alertService = {
  getAll: async (params?: { room_id?: number; status_filter?: string; limit?: number }): Promise<Alert[]> => {
    const res = await api.get('/api/alerts', { params });
    return res.data;
  },
  markRead: async (id: number): Promise<Alert> => {
    const res = await api.put(`/api/alerts/${id}/read`);
    return res.data;
  },
  resolve: async (id: number): Promise<Alert> => {
    const res = await api.put(`/api/alerts/${id}/resolve`);
    return res.data;
  },
};

export const genaiService = {
  analyzeAnomaly: async (anomalyId: number): Promise<AIReport> => {
    const res = await api.post('/api/analyze-anomaly', { anomaly_id: anomalyId });
    return res.data;
  },
  getReportsForRoom: async (roomId: number): Promise<AIReport[]> => {
    const res = await api.get(`/api/ai-reports/${roomId}`);
    return res.data;
  },
};

export const adminService = {
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    const res = await api.get('/api/admin/dashboard');
    return res.data;
  },
  getUsers: async (): Promise<User[]> => {
    const res = await api.get('/api/admin/users');
    return res.data;
  },
  updateUser: async (id: number, data: Partial<User>): Promise<User> => {
    const res = await api.put(`/api/admin/users/${id}`, data);
    return res.data;
  },
  deleteUser: async (id: number) => {
    const res = await api.delete(`/api/admin/users/${id}`);
    return res.data;
  },
};

export const analyticsService = {
  getTemperatureTrend: async (roomId: number, limit = 40): Promise<Array<{ timestamp: string; temperature: number }>> => {
    const res = await api.get(`/api/analytics/temperature/${roomId}`, { params: { limit } });
    return res.data;
  },
  getHumidityTrend: async (roomId: number, limit = 40): Promise<Array<{ timestamp: string; humidity: number }>> => {
    const res = await api.get(`/api/analytics/humidity/${roomId}`, { params: { limit } });
    return res.data;
  },
  getAnomalyDistribution: async (): Promise<Array<{ anomaly_type: string; count: number }>> => {
    const res = await api.get('/api/analytics/anomalies');
    return res.data;
  },
  getRoomComparisons: async (): Promise<RoomComparison[]> => {
    const res = await api.get('/api/analytics/rooms');
    return res.data;
  },
};

export const systemService = {
  getHealth: async (): Promise<SystemHealth> => {
    const res = await api.get('/health');
    return res.data;
  },
};
