export interface User {
  id: number;
  name: string;
  email: string;
  role_name: 'ADMIN' | 'STUDENT';
  room_id?: number;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: 'ADMIN' | 'STUDENT';
  user_id: number;
  name: string;
  email: string;
  room_id?: number;
}

export interface Room {
  id: number;
  room_number: string;
  block: string;
  floor: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  created_at: string;
  sensor_count: number;
  active_anomalies_count: number;
}

export interface Sensor {
  id: number;
  room_id: number;
  sensor_type: string;
  device_id: string;
  status: 'ONLINE' | 'OFFLINE' | 'FAULT';
  last_seen: string;
  created_at: string;
}

export interface SensorData {
  id: number;
  room_id: number;
  temperature: number;
  humidity: number;
  light: number;
  motion: number;
  air_quality: number | null;
  is_simulated: boolean;
  timestamp: string;
}

export interface SensorIngestResponse {
  status: string;
  data_id: number;
  room_id: number;
  is_anomaly: boolean;
  anomaly_type?: string;
  severity?: 'WARNING' | 'CRITICAL' | 'NORMAL';
  confidence: number;
  alert_created: boolean;
  ai_report_generated: boolean;
}

export interface Anomaly {
  id: number;
  room_id: number;
  anomaly_type: string;
  severity: 'WARNING' | 'CRITICAL' | 'INFO';
  confidence: number;
  description: string;
  status: 'ACTIVE' | 'RESOLVED' | 'INVESTIGATING';
  detected_at: string;
  resolved_at?: string;
}

export interface Alert {
  id: number;
  room_id: number;
  anomaly_id: number;
  severity: 'WARNING' | 'CRITICAL';
  message: string;
  status: 'UNREAD' | 'READ' | 'RESOLVED';
  created_at: string;
}

export interface AIReport {
  id: number;
  anomaly_id: number;
  explanation: string;
  possible_causes: string;
  recommendation: string;
  created_at: string;
}

export interface AdminDashboardStats {
  total_rooms: number;
  active_sensors: number;
  online_devices: number;
  normal_rooms: number;
  active_anomalies: number;
  critical_alerts: number;
}

export interface RoomComparison {
  room_id: number;
  room_number: string;
  block: string;
  floor: number;
  temperature: number;
  humidity: number;
  air_quality: number;
  active_anomalies: number;
  status: 'NORMAL' | 'ANOMALOUS';
}

export interface SystemHealth {
  status: string;
  database: string;
  dnn_model: string;
  genai: string;
  timestamp: string;
}
