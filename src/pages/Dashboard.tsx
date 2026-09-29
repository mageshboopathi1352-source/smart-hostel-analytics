import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  sensorService,
  anomalyService,
  alertService,
  genaiService,
  adminService,
  analyticsService,
  roomService,
} from '../services/api';
import type {
  SensorData,
  Anomaly,
  Alert,
  AIReport,
  AdminDashboardStats,
  RoomComparison,
  Room,
} from '../types';
import { SensorGauges } from '../components/SensorGauges';
import { HistoricalCharts } from '../components/HistoricalCharts';
import { AIReportCard } from '../components/AIReportCard';
import {
  Activity,
  AlertTriangle,
  Building,
  CheckCircle2,
  Clock,
  Cpu,
  Flame,
  Microchip,
  Radio,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';

interface DashboardProps {
  onOpenSimulation: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenSimulation }) => {
  const { user, role } = useAuth();

  // Selected room for active view
  const [selectedRoomId, setSelectedRoomId] = useState<number>(user?.room_id || 101);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [latestData, setLatestData] = useState<SensorData | null>(null);
  const [historyData, setHistoryData] = useState<SensorData[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [aiReport, setAiReport] = useState<AIReport | null>(null);
  const [adminStats, setAdminStats] = useState<AdminDashboardStats | null>(null);
  const [roomComparisons, setRoomComparisons] = useState<RoomComparison[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Auto-refresh telemetry & states
  const fetchData = async () => {
    try {
      // 1. Rooms
      const rList = await roomService.getAll();
      setRooms(rList);

      // If student, lock to their assigned room
      const targetRoom = role === 'STUDENT' && user?.room_id ? user.room_id : selectedRoomId;

      // 2. Latest & History Sensor Data
      try {
        const latest = await sensorService.getLatest(targetRoom);
        setLatestData(latest);
      } catch {
        // Fallback if no data recorded yet
      }

      const history = await sensorService.getHistory(targetRoom, 30);
      setHistoryData(history);

      // 3. Anomalies & Alerts
      const anomList = await anomalyService.getAll({
        room_id: role === 'STUDENT' ? targetRoom : undefined,
        limit: 10,
      });
      setAnomalies(anomList);

      const alertList = await alertService.getAll({
        room_id: role === 'STUDENT' ? targetRoom : undefined,
        limit: 10,
      });
      setAlerts(alertList);

      // 4. Latest AI Report for active room
      const reports = await genaiService.getReportsForRoom(targetRoom);
      if (reports && reports.length > 0) {
        setAiReport(reports[0]);
      } else {
        setAiReport(null);
      }

      // 5. Admin Stats if Admin
      if (role === 'ADMIN') {
        const stats = await adminService.getDashboardStats();
        setAdminStats(stats);
        const comp = await analyticsService.getRoomComparisons();
        setRoomComparisons(comp);
      }

      setLastRefreshed(new Date());
    } catch (err) {
      console.warn('Dashboard fetch info:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, [selectedRoomId, role, user]);

  const handleResolveAlert = async (alertId: number) => {
    await alertService.resolve(alertId);
    fetchData();
  };

  const handleResolveAnomaly = async (anomalyId: number) => {
    await anomalyService.resolve(anomalyId);
    fetchData();
  };

  const handleGenerateAIForAnomaly = async (anomalyId: number) => {
    setIsGeneratingAI(true);
    try {
      const rep = await genaiService.analyzeAnomaly(anomalyId);
      setAiReport(rep);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const activeAnomaly = anomalies.find((a) => a.status === 'ACTIVE' && a.room_id === selectedRoomId);

  return (
    <div className="space-y-6">
      {/* Top Banner & Room Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-300 border border-cyan-700/50">
              {role === 'ADMIN' ? 'Facility Admin Oversight' : 'Student Room Telemetry'}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Refreshed: {lastRefreshed.toLocaleTimeString()}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
            {role === 'ADMIN'
              ? 'Campus Hostel Facility Environment & Hazard Matrix'
              : `Room ${user?.room_id || selectedRoomId} Real-Time Microclimate`}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Room Selector (Admin can switch, Student locked or switches view) */}
          {role === 'ADMIN' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Select Room:</span>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(parseInt(e.target.value, 10))}
                className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-2 cursor-pointer focus:ring-1 focus:ring-cyan-500"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} (Block {r.block})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => {
              setIsLoading(true);
              fetchData().finally(() => setIsLoading(false));
            }}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Admin KPI Cards (When Admin) */}
      {role === 'ADMIN' && adminStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="text-slate-400 text-xs font-semibold uppercase flex items-center justify-between">
              <span>Rooms</span>
              <Building className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">{adminStats.total_rooms}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Monitoring Active</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="text-slate-400 text-xs font-semibold uppercase flex items-center justify-between">
              <span>Sensors</span>
              <Microchip className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">{adminStats.active_sensors}</div>
            <div className="text-[10px] text-emerald-400 mt-0.5">{adminStats.online_devices} Online Nodes</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="text-slate-400 text-xs font-semibold uppercase flex items-center justify-between">
              <span>Normal</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">{adminStats.normal_rooms}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Safe Environment</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="text-slate-400 text-xs font-semibold uppercase flex items-center justify-between">
              <span>Anomalies</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-400 mt-2">{adminStats.active_anomalies}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">LSTM Flagged</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="text-slate-400 text-xs font-semibold uppercase flex items-center justify-between">
              <span>Critical</span>
              <Flame className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-extrabold text-red-400 mt-2">{adminStats.critical_alerts}</div>
            <div className="text-[10px] text-red-400 mt-0.5">Immediate Action</div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-800/40 shadow-sm">
            <div className="text-indigo-300 text-xs font-semibold uppercase flex items-center justify-between">
              <span>GenAI Status</span>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-sm font-bold text-white mt-2">Active</div>
            <div className="text-[10px] text-indigo-400 mt-1 font-mono">Gemini 3.8 Flash</div>
          </div>
        </div>
      )}

      {/* Critical Alert Ribbon if any active */}
      {alerts.filter((a) => a.status === 'UNREAD').length > 0 && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/70 shadow-lg text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-600/30 text-red-400 border border-red-500/30 animate-pulse">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase font-bold text-red-400">
                ACTIVE SAFETY BREACH DETECTED
              </div>
              <div className="text-sm font-semibold text-white">
                {alerts.find((a) => a.status === 'UNREAD')?.message}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const unread = alerts.find((a) => a.status === 'UNREAD');
                if (unread) handleResolveAlert(unread.id);
              }}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Acknowledge & Resolve
            </button>
          </div>
        </div>
      )}

      {/* 5-Sensor Telemetry Gauges for Selected Room */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>Room {selectedRoomId} Live Physical Telemetry (ESP32 Ingestion)</span>
          </h2>
          <button
            onClick={onOpenSimulation}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Simulate Sensor Spike &rarr;</span>
          </button>
        </div>
        <SensorGauges data={latestData} roomNumber={String(selectedRoomId)} />
      </div>

      {/* Gemini GenAI Diagnosis Card */}
      <AIReportCard
        report={aiReport}
        anomaly={activeAnomaly}
        isLoading={isGeneratingAI}
        onGenerateReport={() => activeAnomaly && handleGenerateAIForAnomaly(activeAnomaly.id)}
      />

      {/* Historical Dynamics Charts */}
      <HistoricalCharts data={historyData} roomNumber={String(selectedRoomId)} />

      {/* Admin Multi-Room Comparative Matrix */}
      {role === 'ADMIN' && roomComparisons.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Hostel Multi-Room Comparison Matrix</h3>
              <p className="text-xs text-slate-400">Live environmental snapshot across hostel wings</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">{roomComparisons.length} Rooms Polled</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Room</th>
                  <th className="p-3">Block / Floor</th>
                  <th className="p-3">Temperature</th>
                  <th className="p-3">Humidity</th>
                  <th className="p-3">Air Quality</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {roomComparisons.map((r) => (
                  <tr key={r.room_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-white">Room {r.room_number}</td>
                    <td className="p-3">Block {r.block} • Floor {r.floor}</td>
                    <td className="p-3 font-mono font-semibold">
                      <span className={(r.temperature ?? 26) >= 35 ? 'text-red-400' : (r.temperature ?? 26) >= 32 ? 'text-amber-400' : 'text-cyan-400'}>
                        {(typeof r.temperature === 'number' ? r.temperature : 26.0).toFixed(1)} °C
                      </span>
                    </td>
                    <td className="p-3 font-mono font-semibold">
                      <span className={(r.humidity ?? 50) >= 80 ? 'text-red-400' : (r.humidity ?? 50) >= 70 ? 'text-amber-400' : 'text-blue-400'}>
                        {(typeof r.humidity === 'number' ? r.humidity : 50.0).toFixed(1)} %
                      </span>
                    </td>
                    <td className="p-3 font-mono font-semibold text-purple-400">
                      {(typeof r.air_quality === 'number' ? r.air_quality : 45.0).toFixed(1)} ppm
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          r.status === 'ANOMALOUS'
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedRoomId(r.room_id)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Inspect Telemetry
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Anomalies & Alert Resolution Center */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomalies Table */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>DNN Detected Anomalies</span>
            </h3>
            <span className="text-xs text-slate-500">Last 10 Events</span>
          </div>

          {anomalies.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No anomalies recorded in database</p>
          ) : (
            <div className="space-y-3">
              {anomalies.map((anom) => (
                <div
                  key={anom.id}
                  className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition-colors flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          anom.severity === 'CRITICAL'
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {anom.severity}
                      </span>
                      <span className="text-xs font-bold text-white">{anom.anomaly_type}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Room {anom.room_id} • Conf: {((typeof anom.confidence === 'number' ? anom.confidence : 0.85) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-snug">{anom.description}</p>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(anom.detected_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {anom.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handleResolveAnomaly(anom.id)}
                        className="px-2.5 py-1 rounded bg-slate-700 hover:bg-emerald-600 text-white text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Resolve
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts Center */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Campus Facility Alerts Feed</span>
            </h3>
            <span className="text-xs text-slate-500">Real-time Push</span>
          </div>

          {alerts.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No alerts triggered</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((al) => (
                <div
                  key={al.id}
                  className={`p-3 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
                    al.status === 'UNREAD'
                      ? 'bg-red-950/20 border-red-800/60'
                      : 'bg-slate-800/40 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          al.severity === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'
                        }`}
                      >
                        {al.severity}
                      </span>
                      <span className="text-xs font-semibold text-white">Alert #{al.id}</span>
                      <span className="text-[10px] text-slate-400">Room {al.room_id}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-snug">{al.message}</p>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {new Date(al.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  {al.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleResolveAlert(al.id)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
