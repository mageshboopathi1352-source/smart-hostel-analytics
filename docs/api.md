# FastAPI REST API Documentation

The backend runs on FastAPI with automatic interactive documentation available at `/docs` (Swagger UI) and `/redoc`.

## Authentication Endpoints
- `POST /api/auth/register` : Create student or admin account with bcrypt hashed password.
- `POST /api/auth/login` : Authenticate credentials and return JWT bearer token.
- `POST /api/auth/refresh` : Refresh active JWT token.
- `POST /api/auth/logout` : Logout and record audit log.
- `GET /api/auth/me` : Get current user details and role.

## Sensor & Telemetry Endpoints
- `POST /api/sensor-data` : Ingest telemetry from ESP32 or Simulator. Runs real-time LSTM DNN inference and triggers GenAI analysis if an anomaly is detected.
- `GET /api/sensor-data` : Query historical telemetry with room filtering.
- `GET /api/sensor-data/latest/{room_id}` : Get latest reading for a specific room.
- `GET /api/sensor-data/history/{room_id}` : Get recent 30-50 readings for dashboard charts.

## Room Management Endpoints
- `GET /api/rooms` : List all hostel rooms with active sensor counts and anomaly flags.
- `POST /api/rooms` : Create a new room (Admin only).
- `GET /api/rooms/{id}` : Get room details.
- `PUT /api/rooms/{id}` : Update room properties (Admin only).
- `DELETE /api/rooms/{id}` : Delete room (Admin only).

## Anomaly & Alert Endpoints
- `POST /api/predict-anomaly` : Manual DNN anomaly prediction test.
- `GET /api/anomalies` : List detected environmental anomalies.
- `PUT /api/anomalies/{id}/resolve` : Mark anomaly resolved.
- `GET /api/alerts` : List alerts with severity filtering.
- `PUT /api/alerts/{id}/read` : Mark alert as acknowledged.
- `PUT /api/alerts/{id}/resolve` : Resolve active alert.

## GenAI Intelligent Diagnostics
- `POST /api/analyze-anomaly` : Request Gemini-powered root-cause analysis and actionable recommendations.
- `GET /api/ai-reports/{room_id}` : Get past AI diagnosis reports for a room.

## Admin & Analytics
- `GET /api/admin/dashboard` : Overall facility stats (rooms, sensors, anomalies, alerts).
- `GET /api/admin/users` : Manage user list and roles.
- `GET /api/analytics/temperature/{room_id}` : Time-series temperature trends.
- `GET /api/analytics/humidity/{room_id}` : Time-series humidity trends.
- `GET /api/analytics/anomalies` : Breakdown of anomaly types.
- `GET /api/analytics/rooms` : Multi-room comparative matrix.
- `GET /health` : Database and model health check.
