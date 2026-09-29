import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { hardwareSensorService, roomService } from '../services/api';
import type { Sensor, Room } from '../types';
import { Microchip, Plus, Trash2, Radio, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export const SensorsView: React.FC = () => {
  const { role } = useAuth();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [roomId, setRoomId] = useState<number>(101);
  const [sensorType, setSensorType] = useState('ESP32_MULTI_SENSOR');
  const [deviceId, setDeviceId] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sList, rList] = await Promise.all([
        hardwareSensorService.getAll(),
        roomService.getAll(),
      ]);
      setSensors(sList);
      setRooms(rList);
      if (rList.length > 0) setRoomId(rList[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSensor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hardwareSensorService.create({
        room_id: roomId,
        sensor_type: sensorType,
        device_id: deviceId || `ESP32_HOSTEL_${roomId}_${Date.now().toString().slice(-4)}`,
        status: 'ONLINE',
      });
      setIsAddModalOpen(false);
      setDeviceId('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create sensor');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this hardware node?')) return;
    try {
      await hardwareSensorService.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete sensor');
    }
  };

  const handleToggleStatus = async (sensor: Sensor) => {
    const nextStatus = sensor.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    try {
      await hardwareSensorService.update(sensor.id, { status: nextStatus });
      loadData();
    } catch (err: any) {
      alert('Failed to update sensor status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Microchip className="w-5 h-5 text-indigo-400" />
            <span>ESP32 Physical IoT Sensor Nodes Fleet</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registered embedded microcontrollers and multi-sensor clusters
          </p>
        </div>

        {role === 'ADMIN' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Register ESP32 Node</span>
          </button>
        )}
      </div>

      {/* Sensor Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4">Node Device ID</th>
                <th className="p-4">Assigned Room</th>
                <th className="p-4">Hardware Profile</th>
                <th className="p-4">Status</th>
                <th className="p-4">Last Telemetry Ping</th>
                {role === 'ADMIN' && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {sensors.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-mono font-bold text-white flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{s.device_id}</span>
                  </td>
                  <td className="p-4 font-bold text-white">Room {s.room_id}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700 font-mono text-[11px]">
                      {s.sensor_type}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => role === 'ADMIN' && handleToggleStatus(s)}
                      disabled={role !== 'ADMIN'}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                        s.status === 'ONLINE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      } ${role === 'ADMIN' ? 'cursor-pointer hover:opacity-80' : ''}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                      <span>{s.status}</span>
                    </button>
                  </td>
                  <td className="p-4 font-mono text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(s.last_seen).toLocaleString()}</span>
                    </div>
                  </td>
                  {role === 'ADMIN' && (
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete Sensor Node"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Sensor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Register ESP32 Node</h3>
            <p className="text-xs text-slate-400 mb-4">Add an ESP32 hardware device to room telemetry ingest</p>

            <form onSubmit={handleCreateSensor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Room</label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2.5"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.room_number} (Block {r.block})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Hardware Sensor Cluster</label>
                <select
                  value={sensorType}
                  onChange={(e) => setSensorType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2.5"
                >
                  <option value="ESP32_MULTI_SENSOR">ESP32 + DHT22 + LDR + PIR + MQ-135</option>
                  <option value="DHT22_STANDALONE">DHT22 Thermal & Humidity Node</option>
                  <option value="MQ135_GAS_DETECTOR">MQ-135 Gas & Smoke Detector</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Device Hardware ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. ESP32_HOSTEL_104"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Register Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
