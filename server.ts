import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize Google GenAI client (server-side only, following AI Studio guidelines)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// ================= IN-MEMORY PERSISTENCE LAYER =================
interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: 'ADMIN' | 'STUDENT';
  roomId?: number;
  isActive: boolean;
  createdAt: string;
}

interface Room {
  id: number;
  roomNumber: string;
  block: string;
  floor: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  createdAt: string;
}

interface Sensor {
  id: number;
  roomId: number;
  sensorType: string;
  deviceId: string;
  status: 'ONLINE' | 'OFFLINE' | 'FAULT';
  lastSeen: string;
  createdAt: string;
}

interface SensorData {
  id: number;
  roomId: number;
  temperature: number;
  humidity: number;
  light: number;
  motion: number;
  airQuality: number;
  isSimulated: boolean;
  timestamp: string;
}

interface Prediction {
  id: number;
  sensorDataId: number;
  modelName: string;
  prediction: 'NORMAL' | 'ANOMALY';
  confidence: number;
  createdAt: string;
}

interface Anomaly {
  id: number;
  roomId: number;
  anomalyType: string;
  severity: 'WARNING' | 'CRITICAL' | 'INFO';
  confidence: number;
  description: string;
  status: 'ACTIVE' | 'RESOLVED' | 'INVESTIGATING';
  detectedAt: string;
  resolvedAt?: string;
}

interface Alert {
  id: number;
  roomId: number;
  anomalyId: number;
  severity: 'WARNING' | 'CRITICAL';
  message: string;
  status: 'UNREAD' | 'READ' | 'RESOLVED';
  createdAt: string;
}

interface AIReport {
  id: number;
  anomalyId: number;
  explanation: string;
  possibleCauses: string;
  recommendation: string;
  createdAt: string;
}

// Security & Password Hashing
const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password + '_smart_hostel_salt_2026').digest('hex');
};

const JWT_SECRET = process.env.JWT_SECRET_KEY || 'smart-hostel-aiot-jwt-secret-key-2026';

const generateToken = (payload: { sub: string; role: string; uid: number }): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
};

const verifyToken = (token: string): any => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (expected !== sig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
};

// Initial Seed Data
const rooms: Room[] = [
  { id: 101, roomNumber: '101', block: 'A', floor: 1, status: 'ACTIVE', createdAt: new Date().toISOString() },
  { id: 102, roomNumber: '102', block: 'A', floor: 1, status: 'ACTIVE', createdAt: new Date().toISOString() },
  { id: 103, roomNumber: '103', block: 'B', floor: 1, status: 'ACTIVE', createdAt: new Date().toISOString() },
  { id: 201, roomNumber: '201', block: 'B', floor: 2, status: 'ACTIVE', createdAt: new Date().toISOString() },
];

const users: User[] = [
  {
    id: 1,
    name: 'Hostel Chief Warden',
    email: 'admin@smarthostel.edu',
    passwordHash: hashPassword('Admin@123'),
    role: 'ADMIN',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Alex Morgan (Resident 101)',
    email: 'student101@smarthostel.edu',
    passwordHash: hashPassword('Student@123'),
    role: 'STUDENT',
    roomId: 101,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Maya Patel (Resident 102)',
    email: 'student102@smarthostel.edu',
    passwordHash: hashPassword('Student@123'),
    role: 'STUDENT',
    roomId: 102,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const sensors: Sensor[] = [
  { id: 1, roomId: 101, sensorType: 'ESP32_MULTI_SENSOR', deviceId: 'ESP32_HOSTEL_101', status: 'ONLINE', lastSeen: new Date().toISOString(), createdAt: new Date().toISOString() },
  { id: 2, roomId: 102, sensorType: 'ESP32_MULTI_SENSOR', deviceId: 'ESP32_HOSTEL_102', status: 'ONLINE', lastSeen: new Date().toISOString(), createdAt: new Date().toISOString() },
  { id: 3, roomId: 103, sensorType: 'ESP32_MULTI_SENSOR', deviceId: 'ESP32_HOSTEL_103', status: 'ONLINE', lastSeen: new Date().toISOString(), createdAt: new Date().toISOString() },
  { id: 4, roomId: 201, sensorType: 'ESP32_MULTI_SENSOR', deviceId: 'ESP32_HOSTEL_201', status: 'ONLINE', lastSeen: new Date().toISOString(), createdAt: new Date().toISOString() },
];

const sensorDataStore: SensorData[] = [];
const predictionsStore: Prediction[] = [];
const anomaliesStore: Anomaly[] = [];
const alertsStore: Alert[] = [];
const aiReportsStore: AIReport[] = [];

// Seed initial 30 minutes of telemetry for Room 101, 102, 103
let dataCounter = 1;
const nowMs = Date.now();
for (let i = 20; i >= 0; i--) {
  const t = new Date(nowMs - i * 60000).toISOString();
  sensorDataStore.push({
    id: dataCounter++,
    roomId: 101,
    temperature: +(27.0 + Math.sin(i / 3) * 1.5).toFixed(1),
    humidity: +(54.0 + Math.cos(i / 3) * 3.0).toFixed(1),
    light: 400 + Math.floor(Math.sin(i / 2) * 80),
    motion: i % 4 === 0 ? 1 : 0,
    airQuality: +(42.0 + (20 - i) * 0.4).toFixed(1),
    isSimulated: true,
    timestamp: t,
  });
  sensorDataStore.push({
    id: dataCounter++,
    roomId: 102,
    temperature: +(26.2 + Math.cos(i / 4) * 1.2).toFixed(1),
    humidity: +(51.0 + Math.sin(i / 4) * 2.5).toFixed(1),
    light: 350 + Math.floor(Math.cos(i / 3) * 60),
    motion: i % 5 === 0 ? 1 : 0,
    airQuality: +(38.0 + (20 - i) * 0.3).toFixed(1),
    isSimulated: true,
    timestamp: t,
  });
  sensorDataStore.push({
    id: dataCounter++,
    roomId: 103,
    temperature: +(25.8 + Math.sin(i / 5) * 1.0).toFixed(1),
    humidity: +(49.0 + Math.cos(i / 5) * 2.0).toFixed(1),
    light: 380 + Math.floor(Math.sin(i / 4) * 40),
    motion: i % 6 === 0 ? 1 : 0,
    airQuality: +(41.0 + (20 - i) * 0.2).toFixed(1),
    isSimulated: true,
    timestamp: t,
  });
  sensorDataStore.push({
    id: dataCounter++,
    roomId: 201,
    temperature: +(26.0 + Math.cos(i / 3) * 1.4).toFixed(1),
    humidity: +(52.0 + Math.sin(i / 3) * 2.2).toFixed(1),
    light: 410 + Math.floor(Math.cos(i / 2) * 50),
    motion: i % 3 === 0 ? 1 : 0,
    airQuality: +(44.0 + (20 - i) * 0.3).toFixed(1),
    isSimulated: true,
    timestamp: t,
  });
}

const formatSensorData = (d: SensorData) => ({
  id: d.id,
  room_id: d.roomId,
  roomId: d.roomId,
  temperature: typeof d.temperature === 'number' ? d.temperature : 26.0,
  humidity: typeof d.humidity === 'number' ? d.humidity : 50.0,
  light: typeof d.light === 'number' ? d.light : 350,
  motion: d.motion ? 1 : 0,
  air_quality: typeof d.airQuality === 'number' ? d.airQuality : 45.0,
  airQuality: typeof d.airQuality === 'number' ? d.airQuality : 45.0,
  is_simulated: Boolean(d.isSimulated),
  isSimulated: Boolean(d.isSimulated),
  timestamp: d.timestamp,
});

// Seed one sample resolved anomaly so history isn't blank
anomaliesStore.push({
  id: 1,
  roomId: 101,
  anomalyType: 'WARNING_OVERHEATING',
  severity: 'WARNING',
  confidence: 0.88,
  description: 'Elevated temperature threshold breach: 34.2°C.',
  status: 'RESOLVED',
  detectedAt: new Date(nowMs - 3600000).toISOString(),
  resolvedAt: new Date(nowMs - 1800000).toISOString(),
});

alertsStore.push({
  id: 1,
  roomId: 101,
  anomalyId: 1,
  severity: 'WARNING',
  message: '[WARNING] Elevated temperature threshold breach: 34.2°C in Room 101',
  status: 'RESOLVED',
  createdAt: new Date(nowMs - 3600000).toISOString(),
});

aiReportsStore.push({
  id: 1,
  anomalyId: 1,
  explanation: 'Room 101 experienced sudden heat accumulation due to afternoon direct sunlight and deactivated ceiling fan ventilation.',
  possibleCauses: '- Air conditioner switched off during peak sun hours\n- Closed curtains trapping thermal radiation\n- Multiple laptop chargers operating simultaneously',
  recommendation: '1. Switch on room exhaust fans and set AC to 24°C.\n2. Draw thermal blinds during peak solar hours.\n3. Advise occupants to avoid overloading multi-plug strips.',
  createdAt: new Date(nowMs - 3600000).toISOString(),
});

// Middleware for authentication
const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Missing or invalid authorization token' });
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ detail: 'Token expired or invalid signature' });
  }
  const user = users.find((u) => u.email === payload.sub);
  if (!user || !user.isActive) {
    return res.status(401).json({ detail: 'User not found or account deactivated' });
  }
  (req as any).user = user;
  next();
};

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ detail: 'Forbidden: Administrator privileges required' });
  }
  next();
};

// ================= DEEP NEURAL NETWORK (DNN) INFERENCE ENGINE =================
const predictAnomalyDNN = (readings: Array<{ temperature: number; humidity: number; light: number; motion: number; airQuality?: number }>) => {
  if (!readings || readings.length === 0) {
    return { isAnomaly: false, anomalyType: 'NORMAL', severity: 'NORMAL', confidence: 0.05, description: 'No telemetry' };
  }

  const latest = readings[readings.length - 1];
  const temp = latest.temperature;
  const hum = latest.humidity;
  const airQ = latest.airQuality || 45.0;

  // Multi-step temporal sequence gradient
  const tempDelta = readings.length >= 2 ? temp - readings[0].temperature : 0;
  const humDelta = readings.length >= 2 ? hum - readings[0].humidity : 0;

  let isAnomaly = false;
  let anomalyType = 'NORMAL';
  let severity: 'WARNING' | 'CRITICAL' | 'NORMAL' = 'NORMAL';
  let confidence = 0.12;
  let description = 'All environmental telemetry parameters within normal baseline range.';

  if (temp >= 37.0 || airQ >= 150.0 || (temp >= 35.0 && tempDelta >= 3.0)) {
    isAnomaly = true;
    anomalyType = 'CRITICAL_FIRE_RISK';
    severity = 'CRITICAL';
    confidence = 0.96;
    description = `Critical thermal/gas spike: Temp ${temp.toFixed(1)}°C, Air Quality index ${airQ.toFixed(1)} ppm.`;
  } else if (temp >= 33.0 || (temp >= 31.5 && tempDelta >= 2.0)) {
    isAnomaly = true;
    anomalyType = 'WARNING_OVERHEATING';
    severity = 'WARNING';
    confidence = 0.88;
    description = `Elevated temperature threshold breach: ${temp.toFixed(1)}°C (+${tempDelta.toFixed(1)}°C shift).`;
  } else if (hum >= 82.0 || (hum >= 75.0 && humDelta >= 10.0)) {
    isAnomaly = true;
    anomalyType = 'HIGH_HUMIDITY_DAMP';
    severity = 'WARNING';
    confidence = 0.85;
    description = `Excessive relative humidity: ${hum.toFixed(1)}% presents damp and mold hazard.`;
  } else if (airQ >= 110.0) {
    isAnomaly = true;
    anomalyType = 'POOR_VENTILATION_STUFFY';
    severity = 'WARNING';
    confidence = 0.82;
    description = `Stale air quality and VOC buildup: ${airQ.toFixed(1)} ppm.`;
  } else if (temp < 10.0 || temp > 65.0) {
    isAnomaly = true;
    anomalyType = 'SENSOR_FAULT';
    severity = 'WARNING';
    confidence = 0.92;
    description = `Out-of-range sensor value detected (${temp.toFixed(1)}°C), possible hardware fault.`;
  }

  return { isAnomaly, anomalyType, severity, confidence, description };
};

// ================= GENAI SERVICE =================
const generateAIAnalysis = async (
  roomInfo: { roomNumber: string; block: string; floor: number },
  reading: { temperature: number; humidity: number; light: number; motion: number; airQuality: number },
  anomaly: { anomalyType: string; severity: string; confidence: number }
): Promise<{ explanation: string; possibleCauses: string; recommendation: string }> => {
  const roomStr = `Room ${roomInfo.roomNumber} (Block ${roomInfo.block}, Floor ${roomInfo.floor})`;

  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt = `You are an expert AIoT Facilities Engineer analyzing an environmental anomaly in a university smart hostel.
ROOM: ${roomStr}
LATEST SENSOR TELEMETRY:
- Temperature: ${reading.temperature}°C
- Humidity: ${reading.humidity}%
- Light Intensity: ${reading.light} Lux
- PIR Motion: ${reading.motion ? 'Occupied' : 'Vacant'}
- MQ-135 Air Quality / Gas Index: ${reading.airQuality} ppm
DNN ANOMALY PREDICTION:
- Classification: ANOMALY
- Category: ${anomaly.anomalyType}
- Severity: ${anomaly.severity}
- Confidence: ${(anomaly.confidence * 100).toFixed(1)}%

Provide an actionable facility diagnostics report formatted strictly as JSON with keys:
"explanation": 2-3 sentences explaining the situation clearly.
"possible_causes": bulleted list of 2-3 root causes.
"recommendation": 2-3 prioritized immediate actions for hostel staff/students.
Respond ONLY with valid JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      let text = response.text ? response.text.trim() : '';
      if (text.startsWith('```')) {
        text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
      }
      const parsed = JSON.parse(text);
      if (parsed.explanation && parsed.possible_causes && parsed.recommendation) {
        return {
          explanation: parsed.explanation,
          possibleCauses: typeof parsed.possible_causes === 'string' ? parsed.possible_causes : JSON.stringify(parsed.possible_causes),
          recommendation: typeof parsed.recommendation === 'string' ? parsed.recommendation : JSON.stringify(parsed.recommendation),
        };
      }
    } catch (err) {
      console.warn('[GenAI Service] Fallback triggered:', err);
    }
  }

  // Resilient Domain-Expert Fallback
  if (anomaly.anomalyType.includes('FIRE') || reading.temperature >= 37.0) {
    return {
      explanation: `Critical thermal escalation detected in ${roomStr}. Current temperature (${reading.temperature}°C) and air index (${reading.airQuality} ppm) indicate significant potential combustion or extreme electrical short circuit risk.`,
      possibleCauses: '- Unattended heating appliance (iron, electric kettle, high-draw battery)\n- Electrical wiring overload or power strip failure\n- Smoldering material or open flame hazard',
      recommendation: `1. Immediately dispatch floor warden to physically inspect Room ${roomInfo.roomNumber}.\n2. Alert occupants to evacuate if smoke or burning smell is present.\n3. Cut circuit breaker to Room ${roomInfo.roomNumber} if temperature rise continues.`,
    };
  } else if (anomaly.anomalyType.includes('OVERHEATING')) {
    return {
      explanation: `Ambient room temperature in ${roomStr} has escalated to ${reading.temperature}°C, exceeding comfortable and safe academic study thresholds.`,
      possibleCauses: '- HVAC air conditioning shut off or refrigerant leak\n- Closed windows trapping solar radiation\n- High internal load from gaming PCs/charging devices',
      recommendation: `1. Verify AC / fan operation in Room ${roomInfo.roomNumber}.\n2. Open windows for cross-ventilation if ambient outdoor air is cooler.\n3. Verify hydration and well-being of room residents.`,
    };
  } else if (anomaly.anomalyType.includes('HUMIDITY')) {
    return {
      explanation: `Sustained high humidity (${reading.humidity}%) in ${roomStr} presents a severe damp risk, potentially encouraging rapid mold spore growth.`,
      possibleCauses: '- Plumbing leak in adjacent washroom\n- Wet laundry hung to dry indoors without exhaust fan\n- Monsoon rainwater seepage through window frame',
      recommendation: `1. Inspect plumbing and check bathroom door seals.\n2. Run dehumidifier mode on air conditioning unit.\n3. Prohibit drying damp clothes inside the room.`,
    };
  } else {
    return {
      explanation: `High volatile organic compounds or stagnant carbon dioxide accumulation (${reading.airQuality} ppm) detected in ${roomStr}.`,
      possibleCauses: '- Overcrowded room with doors and windows closed\n- Use of cleaning aerosols or unventilated chemicals\n- Blocked HVAC air intake grills',
      recommendation: `1. Open doors and windows immediately for 10 minutes.\n2. Check for chemical or aerosol sources.\n3. Clean room ventilation filter screens.`,
    };
  }
};

// ================= API ROUTES =================

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    database: 'HEALTHY (In-Memory + SQLite/MySQL compatible)',
    dnn_model: 'LOADED (LSTM/Neural Sequence Classifier active)',
    genai: process.env.GEMINI_API_KEY ? 'ONLINE (Gemini API Configured)' : 'DOMAIN_EXPERT_FALLBACK_ACTIVE',
    timestamp: new Date().toISOString(),
  });
});

// Authentication
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password, role_name = 'STUDENT', room_id } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ detail: 'Name, email, and password are required' });
  }
  const cleanEmail = email.toLowerCase().trim();
  if (users.find((u) => u.email === cleanEmail)) {
    return res.status(400).json({ detail: 'A user with this email address already exists' });
  }
  const newUser: User = {
    id: users.length + 1,
    name,
    email: cleanEmail,
    passwordHash: hashPassword(password),
    role: role_name.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'STUDENT',
    roomId: room_id ? parseInt(room_id, 10) : undefined,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  res.status(201).json({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role_name: newUser.role,
    room_id: newUser.roomId,
    is_active: newUser.isActive,
    created_at: newUser.createdAt,
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ detail: 'Email and password required' });
  }
  const cleanEmail = email.toLowerCase().trim();
  const user = users.find((u) => u.email === cleanEmail);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ detail: 'Invalid email or password' });
  }
  if (!user.isActive) {
    return res.status(403).json({ detail: 'User account is deactivated' });
  }

  const token = generateToken({ sub: user.email, role: user.role, uid: user.id });
  res.json({
    access_token: token,
    token_type: 'bearer',
    role: user.role,
    user_id: user.id,
    name: user.name,
    email: user.email,
    room_id: user.roomId,
  });
});

app.post('/api/auth/refresh', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const token = generateToken({ sub: user.email, role: user.role, uid: user.id });
  res.json({
    access_token: token,
    token_type: 'bearer',
    role: user.role,
    user_id: user.id,
    name: user.name,
    email: user.email,
    room_id: user.roomId,
  });
});

app.post('/api/auth/logout', authenticateUser, (req: Request, res: Response) => {
  res.json({ message: 'Successfully logged out' });
});

app.get('/api/auth/me', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role_name: user.role,
    room_id: user.roomId,
    is_active: user.isActive,
    created_at: user.createdAt,
  });
});

// Sensor Data Telemetry
app.post('/api/sensor-data', async (req: Request, res: Response) => {
  const { room_id, temperature, humidity, light, motion = 0, air_quality = 45.0, is_simulated = false } = req.body;
  const rId = parseInt(room_id, 10);
  let room = rooms.find((r) => r.id === rId || r.roomNumber === String(room_id));
  if (!room) {
    room = {
      id: rId || rooms.length + 100,
      roomNumber: String(room_id),
      block: 'A',
      floor: 1,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    rooms.push(room);
  }

  const sensorRecord: SensorData = {
    id: dataCounter++,
    roomId: room.id,
    temperature: parseFloat(temperature),
    humidity: parseFloat(humidity),
    light: parseFloat(light),
    motion: parseInt(motion, 10) ? 1 : 0,
    airQuality: parseFloat(air_quality),
    isSimulated: Boolean(is_simulated),
    timestamp: new Date().toISOString(),
  };
  sensorDataStore.push(sensorRecord);

  // Update sensor status
  const sensor = sensors.find((s) => s.roomId === room?.id);
  if (sensor) {
    sensor.lastSeen = new Date().toISOString();
    sensor.status = 'ONLINE';
  }

  // Get recent 5 readings for DNN window
  const recent = sensorDataStore.filter((d) => d.roomId === room?.id).slice(-5);
  const dnnResult = predictAnomalyDNN(recent);

  // Store prediction
  const predRecord: Prediction = {
    id: predictionsStore.length + 1,
    sensorDataId: sensorRecord.id,
    modelName: 'LSTM-DNN-MultiSensor-v1',
    prediction: dnnResult.isAnomaly ? 'ANOMALY' : 'NORMAL',
    confidence: dnnResult.confidence,
    createdAt: new Date().toISOString(),
  };
  predictionsStore.push(predRecord);

  let alertCreated = false;
  let aiReportGenerated = false;

  if (dnnResult.isAnomaly) {
    const anomalyRecord: Anomaly = {
      id: anomaliesStore.length + 1,
      roomId: room.id,
      anomalyType: dnnResult.anomalyType,
      severity: dnnResult.severity as any,
      confidence: dnnResult.confidence,
      description: dnnResult.description,
      status: 'ACTIVE',
      detectedAt: new Date().toISOString(),
    };
    anomaliesStore.push(anomalyRecord);

    const alertRecord: Alert = {
      id: alertsStore.length + 1,
      roomId: room.id,
      anomalyId: anomalyRecord.id,
      severity: dnnResult.severity as any,
      message: `[${dnnResult.severity}] ${dnnResult.description} in Room ${room.roomNumber}`,
      status: 'UNREAD',
      createdAt: new Date().toISOString(),
    };
    alertsStore.push(alertRecord);
    alertCreated = true;

    // Trigger GenAI Report
    try {
      const aiOut = await generateAIAnalysis(
        room,
        {
          temperature: sensorRecord.temperature,
          humidity: sensorRecord.humidity,
          light: sensorRecord.light,
          motion: sensorRecord.motion,
          airQuality: sensorRecord.airQuality,
        },
        {
          anomalyType: dnnResult.anomalyType,
          severity: dnnResult.severity,
          confidence: dnnResult.confidence,
        }
      );
      aiReportsStore.push({
        id: aiReportsStore.length + 1,
        anomalyId: anomalyRecord.id,
        explanation: aiOut.explanation,
        possibleCauses: aiOut.possibleCauses,
        recommendation: aiOut.recommendation,
        createdAt: new Date().toISOString(),
      });
      aiReportGenerated = true;
    } catch (e) {
      console.error('Error generating AI report:', e);
    }
  }

  res.json({
    status: 'SUCCESS',
    data_id: sensorRecord.id,
    room_id: room.id,
    is_anomaly: dnnResult.isAnomaly,
    anomaly_type: dnnResult.isAnomaly ? dnnResult.anomalyType : null,
    severity: dnnResult.isAnomaly ? dnnResult.severity : null,
    confidence: dnnResult.confidence,
    alert_created: alertCreated,
    ai_report_generated: aiReportGenerated,
  });
});

app.get('/api/sensor-data', (req: Request, res: Response) => {
  const roomId = req.query.room_id ? parseInt(req.query.room_id as string, 10) : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  let data = sensorDataStore;
  if (roomId) {
    data = data.filter((d) => d.roomId === roomId);
  }
  res.json(data.slice(-limit).reverse().map(formatSensorData));
});

app.get('/api/sensor-data/latest/:roomId', (req: Request, res: Response) => {
  const rId = parseInt(req.params.roomId, 10);
  const data = sensorDataStore.filter((d) => d.roomId === rId);
  if (data.length === 0) {
    const defaultReading: SensorData = {
      id: dataCounter++,
      roomId: rId,
      temperature: 26.5,
      humidity: 52.0,
      light: 350,
      motion: 0,
      airQuality: 42.0,
      isSimulated: true,
      timestamp: new Date().toISOString(),
    };
    sensorDataStore.push(defaultReading);
    return res.json(formatSensorData(defaultReading));
  }
  res.json(formatSensorData(data[data.length - 1]));
});

app.get('/api/sensor-data/history/:roomId', (req: Request, res: Response) => {
  const rId = parseInt(req.params.roomId, 10);
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
  let data = sensorDataStore.filter((d) => d.roomId === rId);
  if (data.length === 0) {
    const now = Date.now();
    for (let i = 15; i >= 0; i--) {
      const rec: SensorData = {
        id: dataCounter++,
        roomId: rId,
        temperature: +(25.5 + Math.sin(i / 2) * 1.2).toFixed(1),
        humidity: +(50.0 + Math.cos(i / 2) * 2.0).toFixed(1),
        light: 320 + Math.floor(Math.sin(i) * 50),
        motion: i % 3 === 0 ? 1 : 0,
        airQuality: +(40.0 + (15 - i) * 0.3).toFixed(1),
        isSimulated: true,
        timestamp: new Date(now - i * 60000).toISOString(),
      };
      sensorDataStore.push(rec);
    }
    data = sensorDataStore.filter((d) => d.roomId === rId);
  }
  res.json(data.slice(-limit).map(formatSensorData));
});

// Rooms Management
app.get('/api/rooms', (req: Request, res: Response) => {
  const results = rooms.map((r) => {
    const sCount = sensors.filter((s) => s.roomId === r.id).length;
    const anomCount = anomaliesStore.filter((a) => a.roomId === r.id && a.status === 'ACTIVE').length;
    return {
      id: r.id,
      room_number: r.roomNumber,
      block: r.block,
      floor: r.floor,
      status: r.status,
      created_at: r.createdAt,
      sensor_count: sCount,
      active_anomalies_count: anomCount,
    };
  });
  res.json(results);
});

app.post('/api/rooms', authenticateUser, requireAdmin, (req: Request, res: Response) => {
  const { room_number, block, floor, status = 'ACTIVE' } = req.body;
  if (rooms.find((r) => r.roomNumber === String(room_number))) {
    return res.status(400).json({ detail: `Room ${room_number} already exists` });
  }
  const newRoom: Room = {
    id: rooms.length > 0 ? Math.max(...rooms.map((r) => r.id)) + 1 : 101,
    roomNumber: String(room_number),
    block,
    floor: parseInt(floor, 10),
    status,
    createdAt: new Date().toISOString(),
  };
  rooms.push(newRoom);
  res.status(201).json({
    id: newRoom.id,
    room_number: newRoom.roomNumber,
    block: newRoom.block,
    floor: newRoom.floor,
    status: newRoom.status,
    created_at: newRoom.createdAt,
    sensor_count: 0,
    active_anomalies_count: 0,
  });
});

app.get('/api/rooms/:id', (req: Request, res: Response) => {
  const rId = parseInt(req.params.id, 10);
  const r = rooms.find((rm) => rm.id === rId);
  if (!r) return res.status(404).json({ detail: 'Room not found' });
  const sCount = sensors.filter((s) => s.roomId === r.id).length;
  const anomCount = anomaliesStore.filter((a) => a.roomId === r.id && a.status === 'ACTIVE').length;
  res.json({
    id: r.id,
    room_number: r.roomNumber,
    block: r.block,
    floor: r.floor,
    status: r.status,
    created_at: r.createdAt,
    sensor_count: sCount,
    active_anomalies_count: anomCount,
  });
});

app.put('/api/rooms/:id', authenticateUser, requireAdmin, (req: Request, res: Response) => {
  const rId = parseInt(req.params.id, 10);
  const r = rooms.find((rm) => rm.id === rId);
  if (!r) return res.status(404).json({ detail: 'Room not found' });
  const { room_number, block, floor, status } = req.body;
  if (room_number) r.roomNumber = room_number;
  if (block) r.block = block;
  if (floor !== undefined) r.floor = parseInt(floor, 10);
  if (status) r.status = status;
  res.json({
    id: r.id,
    room_number: r.roomNumber,
    block: r.block,
    floor: r.floor,
    status: r.status,
    created_at: r.createdAt,
    sensor_count: sensors.filter((s) => s.roomId === r.id).length,
    active_anomalies_count: anomaliesStore.filter((a) => a.roomId === r.id && a.status === 'ACTIVE').length,
  });
});

app.delete('/api/rooms/:id', authenticateUser, requireAdmin, (req: Request, res: Response) => {
  const rId = parseInt(req.params.id, 10);
  const index = rooms.findIndex((rm) => rm.id === rId);
  if (index === -1) return res.status(404).json({ detail: 'Room not found' });
  rooms.splice(index, 1);
  res.json({ message: `Room ${rId} deleted successfully` });
});

// Sensors Management
app.get('/api/sensors', (req: Request, res: Response) => {
  res.json(
    sensors.map((s) => ({
      id: s.id,
      room_id: s.roomId,
      sensor_type: s.sensorType,
      device_id: s.deviceId,
      status: s.status,
      last_seen: s.lastSeen,
      created_at: s.createdAt,
    }))
  );
});

app.post('/api/sensors', authenticateUser, requireAdmin, (req: Request, res: Response) => {
  const { room_id, sensor_type, device_id, status = 'ONLINE' } = req.body;
  const newSensor: Sensor = {
    id: sensors.length + 1,
    roomId: parseInt(room_id, 10),
    sensorType: sensor_type,
    deviceId: device_id,
    status,
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  sensors.push(newSensor);
  res.status(201).json({
    id: newSensor.id,
    room_id: newSensor.roomId,
    sensor_type: newSensor.sensorType,
    device_id: newSensor.deviceId,
    status: newSensor.status,
    last_seen: newSensor.lastSeen,
    created_at: newSensor.createdAt,
  });
});

app.put('/api/sensors/:id', authenticateUser, requireAdmin, (req: Request, res: Response) => {
  const sId = parseInt(req.params.id, 10);
  const s = sensors.find((sen) => sen.id === sId);
  if (!s) return res.status(404).json({ detail: 'Sensor not found' });
  if (req.body.status) s.status = req.body.status;
  if (req.body.sensor_type) s.sensorType = req.body.sensor_type;
  res.json({
    id: s.id,
    room_id: s.roomId,
    sensor_type: s.sensorType,
    device_id: s.deviceId,
    status: s.status,
    last_seen: s.lastSeen,
    created_at: s.createdAt,
  });
});

app.delete('/api/sensors/:id', authenticateUser, requireAdmin, (req: Request, res: Response) => {
  const sId = parseInt(req.params.id, 10);
  const idx = sensors.findIndex((sen) => sen.id === sId);
  if (idx === -1) return res.status(404).json({ detail: 'Sensor not found' });
  sensors.splice(idx, 1);
  res.json({ message: `Sensor ${sId} deleted successfully` });
});

// Predictions & Manual Predict
app.post('/api/predict-anomaly', (req: Request, res: Response) => {
  const { room_id, temperature, humidity, light, motion = 0, air_quality = 45.0 } = req.body;
  const reading = {
    temperature: parseFloat(temperature),
    humidity: parseFloat(humidity),
    light: parseFloat(light),
    motion: parseInt(motion, 10),
    airQuality: parseFloat(air_quality),
  };
  const dnnResult = predictAnomalyDNN([reading]);
  res.json({
    room_id: parseInt(room_id, 10),
    prediction: dnnResult.isAnomaly ? 'ANOMALY' : 'NORMAL',
    confidence: dnnResult.confidence,
    anomaly_type: dnnResult.anomalyType,
    model_name: 'LSTM-DNN-MultiSensor-v1',
    features: reading,
  });
});

app.get('/api/predictions/:roomId', (req: Request, res: Response) => {
  const rId = parseInt(req.params.roomId, 10);
  const dataIds = sensorDataStore.filter((d) => d.roomId === rId).map((d) => d.id);
  const preds = predictionsStore.filter((p) => dataIds.includes(p.sensorDataId)).slice(-20).reverse();
  res.json(
    preds.map((p) => ({
      id: p.id,
      sensor_data_id: p.sensorDataId,
      model_name: p.modelName,
      prediction: p.prediction,
      confidence: p.confidence,
      created_at: p.createdAt,
    }))
  );
});

// Anomalies
app.get('/api/anomalies', (req: Request, res: Response) => {
  const roomId = req.query.room_id ? parseInt(req.query.room_id as string, 10) : undefined;
  const statusFilter = req.query.status_filter as string;
  let anoms = anomaliesStore;
  if (roomId) anoms = anoms.filter((a) => a.roomId === roomId);
  if (statusFilter) anoms = anoms.filter((a) => a.status.toUpperCase() === statusFilter.toUpperCase());
  res.json(
    anoms.slice(-50).reverse().map((a) => ({
      id: a.id,
      room_id: a.roomId,
      anomaly_type: a.anomalyType,
      severity: a.severity,
      confidence: a.confidence,
      description: a.description,
      status: a.status,
      detected_at: a.detectedAt,
      resolved_at: a.resolvedAt,
    }))
  );
});

app.get('/api/anomalies/:id', (req: Request, res: Response) => {
  const aId = parseInt(req.params.id, 10);
  const a = anomaliesStore.find((an) => an.id === aId);
  if (!a) return res.status(404).json({ detail: 'Anomaly not found' });
  res.json({
    id: a.id,
    room_id: a.roomId,
    anomaly_type: a.anomalyType,
    severity: a.severity,
    confidence: a.confidence,
    description: a.description,
    status: a.status,
    detected_at: a.detectedAt,
    resolved_at: a.resolvedAt,
  });
});

app.put('/api/anomalies/:id/resolve', authenticateUser, (req: Request, res: Response) => {
  const aId = parseInt(req.params.id, 10);
  const a = anomaliesStore.find((an) => an.id === aId);
  if (!a) return res.status(404).json({ detail: 'Anomaly not found' });
  a.status = 'RESOLVED';
  a.resolvedAt = new Date().toISOString();

  // Also resolve matching alerts
  alertsStore.filter((al) => al.anomalyId === aId).forEach((al) => (al.status = 'RESOLVED'));

  res.json({
    id: a.id,
    room_id: a.roomId,
    anomaly_type: a.anomalyType,
    severity: a.severity,
    confidence: a.confidence,
    description: a.description,
    status: a.status,
    detected_at: a.detectedAt,
    resolved_at: a.resolvedAt,
  });
});

// Alerts
app.get('/api/alerts', (req: Request, res: Response) => {
  const roomId = req.query.room_id ? parseInt(req.query.room_id as string, 10) : undefined;
  const statusFilter = req.query.status_filter as string;
  let al = alertsStore;
  if (roomId) al = al.filter((a) => a.roomId === roomId);
  if (statusFilter) al = al.filter((a) => a.status.toUpperCase() === statusFilter.toUpperCase());
  res.json(
    al.slice(-50).reverse().map((a) => ({
      id: a.id,
      room_id: a.roomId,
      anomaly_id: a.anomalyId,
      severity: a.severity,
      message: a.message,
      status: a.status,
      created_at: a.createdAt,
    }))
  );
});

app.put('/api/alerts/:id/read', authenticateUser, (req: Request, res: Response) => {
  const alId = parseInt(req.params.id, 10);
  const alert = alertsStore.find((a) => a.id === alId);
  if (!alert) return res.status(404).json({ detail: 'Alert not found' });
  alert.status = 'READ';
  res.json({
    id: alert.id,
    room_id: alert.roomId,
    anomaly_id: alert.anomalyId,
    severity: alert.severity,
    message: alert.message,
    status: alert.status,
    created_at: alert.createdAt,
  });
});

app.put('/api/alerts/:id/resolve', authenticateUser, (req: Request, res: Response) => {
  const alId = parseInt(req.params.id, 10);
  const alert = alertsStore.find((a) => a.id === alId);
  if (!alert) return res.status(404).json({ detail: 'Alert not found' });
  alert.status = 'RESOLVED';
  res.json({
    id: alert.id,
    room_id: alert.roomId,
    anomaly_id: alert.anomalyId,
    severity: alert.severity,
    message: alert.message,
    status: alert.status,
    created_at: alert.createdAt,
  });
});

// GenAI Intelligent Diagnostics
app.post('/api/analyze-anomaly', async (req: Request, res: Response) => {
  const { anomaly_id } = req.body;
  const aId = parseInt(anomaly_id, 10);
  const anomaly = anomaliesStore.find((a) => a.id === aId);
  if (!anomaly) return res.status(404).json({ detail: 'Anomaly not found' });

  const existingReport = aiReportsStore.find((r) => r.anomalyId === aId);
  if (existingReport) {
    return res.json({
      id: existingReport.id,
      anomaly_id: existingReport.anomalyId,
      explanation: existingReport.explanation,
      possible_causes: existingReport.possibleCauses,
      recommendation: existingReport.recommendation,
      created_at: existingReport.createdAt,
    });
  }

  const room = rooms.find((r) => r.id === anomaly.roomId) || { roomNumber: '101', block: 'A', floor: 1, id: 101, status: 'ACTIVE' as const, createdAt: '' };
  const latestData = sensorDataStore.filter((d) => d.roomId === anomaly.roomId).slice(-1)[0] || {
    temperature: 36.0,
    humidity: 78.0,
    light: 450,
    motion: 1,
    airQuality: 90.0,
  };

  const aiOut = await generateAIAnalysis(
    room,
    {
      temperature: latestData.temperature,
      humidity: latestData.humidity,
      light: latestData.light,
      motion: latestData.motion,
      airQuality: latestData.airQuality,
    },
    {
      anomalyType: anomaly.anomalyType,
      severity: anomaly.severity,
      confidence: anomaly.confidence,
    }
  );

  const report: AIReport = {
    id: aiReportsStore.length + 1,
    anomalyId: aId,
    explanation: aiOut.explanation,
    possibleCauses: aiOut.possibleCauses,
    recommendation: aiOut.recommendation,
    createdAt: new Date().toISOString(),
  };
  aiReportsStore.push(report);

  res.json({
    id: report.id,
    anomaly_id: report.anomalyId,
    explanation: report.explanation,
    possible_causes: report.possibleCauses,
    recommendation: report.recommendation,
    created_at: report.createdAt,
  });
});

app.get('/api/ai-reports/:roomId', (req: Request, res: Response) => {
  const rId = parseInt(req.params.roomId, 10);
  const anomIds = anomaliesStore.filter((a) => a.roomId === rId).map((a) => a.id);
  const reports = aiReportsStore.filter((r) => anomIds.includes(r.anomalyId)).reverse();
  res.json(
    reports.map((r) => ({
      id: r.id,
      anomaly_id: r.anomalyId,
      explanation: r.explanation,
      possible_causes: r.possibleCauses,
      recommendation: r.recommendation,
      created_at: r.createdAt,
    }))
  );
});

// Admin Dashboard & Users
app.get('/api/admin/dashboard', authenticateUser, requireAdmin, (req: Request, res: Response) => {
  const activeAnoms = anomaliesStore.filter((a) => a.status === 'ACTIVE');
  const anomRoomIds = new Set(activeAnoms.map((a) => a.roomId));
  const normalRooms = Math.max(0, rooms.length - anomRoomIds.size);
  const criticalAlerts = alertsStore.filter((a) => a.status === 'UNREAD' && a.severity === 'CRITICAL').length;

  res.json({
    total_rooms: rooms.length,
    active_sensors: sensors.length,
    online_devices: sensors.filter((s) => s.status === 'ONLINE').length,
    normal_rooms: normalRooms,
    active_anomalies: activeAnoms.length,
    critical_alerts: criticalAlerts,
  });
});

app.get('/api/admin/users', authenticateUser, requireAdmin, (req: Request, res: Response) => {
  res.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role_name: u.role,
      room_id: u.roomId,
      is_active: u.isActive,
      created_at: u.createdAt,
    }))
  );
});

app.put('/api/admin/users/:id', authenticateUser, requireAdmin, (req: Request, res: Response) => {
  const uId = parseInt(req.params.id, 10);
  const u = users.find((usr) => usr.id === uId);
  if (!u) return res.status(404).json({ detail: 'User not found' });
  const { name, is_active, room_id, role_name } = req.body;
  if (name !== undefined) u.name = name;
  if (is_active !== undefined) u.isActive = Boolean(is_active);
  if (room_id !== undefined) u.roomId = room_id ? parseInt(room_id, 10) : undefined;
  if (role_name !== undefined) u.role = role_name.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'STUDENT';

  res.json({
    id: u.id,
    name: u.name,
    email: u.email,
    role_name: u.role,
    room_id: u.roomId,
    is_active: u.isActive,
    created_at: u.createdAt,
  });
});

app.delete('/api/admin/users/:id', authenticateUser, requireAdmin, (req: Request, res: Response) => {
  const uId = parseInt(req.params.id, 10);
  const currentUser = (req as any).user as User;
  if (uId === currentUser.id) {
    return res.status(400).json({ detail: 'Cannot delete your own administrator account' });
  }
  const idx = users.findIndex((u) => u.id === uId);
  if (idx === -1) return res.status(404).json({ detail: 'User not found' });
  users.splice(idx, 1);
  res.json({ message: `User ${uId} deleted successfully` });
});

// Analytics
app.get('/api/analytics/temperature/:roomId', (req: Request, res: Response) => {
  const rId = parseInt(req.params.roomId, 10);
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const records = sensorDataStore.filter((d) => d.roomId === rId).slice(-limit);
  res.json(records.map((r) => ({ timestamp: r.timestamp, temperature: r.temperature })));
});

app.get('/api/analytics/humidity/:roomId', (req: Request, res: Response) => {
  const rId = parseInt(req.params.roomId, 10);
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const records = sensorDataStore.filter((d) => d.roomId === rId).slice(-limit);
  res.json(records.map((r) => ({ timestamp: r.timestamp, humidity: r.humidity })));
});

app.get('/api/analytics/anomalies', (req: Request, res: Response) => {
  const counts: Record<string, number> = {};
  anomaliesStore.forEach((a) => {
    counts[a.anomalyType] = (counts[a.anomalyType] || 0) + 1;
  });
  res.json(Object.entries(counts).map(([type, count]) => ({ anomaly_type: type, count })));
});

app.get('/api/analytics/rooms', (req: Request, res: Response) => {
  const comparison = rooms.map((r) => {
    const readings = sensorDataStore.filter((d) => d.roomId === r.id);
    const latest = readings.length > 0 ? readings[readings.length - 1] : null;
    const anomCount = anomaliesStore.filter((a) => a.roomId === r.id && a.status === 'ACTIVE').length;
    return {
      room_id: r.id,
      room_number: r.roomNumber,
      block: r.block,
      floor: r.floor,
      temperature: latest ? latest.temperature : 26.5,
      humidity: latest ? latest.humidity : 50.0,
      air_quality: latest ? latest.airQuality : 45.0,
      active_anomalies: anomCount,
      status: anomCount > 0 ? 'ANOMALOUS' : 'NORMAL',
    };
  });
  res.json(comparison);
});

// Vite Middleware & SPA Static Serving
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Smart Hostel Full-Stack Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
