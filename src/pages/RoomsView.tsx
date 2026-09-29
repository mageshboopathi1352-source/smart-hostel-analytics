import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { roomService } from '../services/api';
import type { Room } from '../types';
import { Building, Plus, Trash2, Edit2, ShieldAlert, Cpu, CheckCircle2 } from 'lucide-react';

export const RoomsView: React.FC = () => {
  const { role } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newBlock, setNewBlock] = useState('A');
  const [newFloor, setNewFloor] = useState('1');
  const [actionError, setActionError] = useState<string | null>(null);

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const data = await roomService.getAll();
      setRooms(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await roomService.create({
        room_number: newRoomNumber,
        block: newBlock,
        floor: parseInt(newFloor, 10),
      });
      setIsAddModalOpen(false);
      setNewRoomNumber('');
      loadRooms();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to create room');
    }
  };

  const handleDeleteRoom = async (id: number) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    try {
      await roomService.delete(id);
      loadRooms();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete room');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-cyan-400" />
            <span>Hostel Room Inventory & Telemetry Nodes</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registered hostel dormitories with multi-sensor monitoring coverage
          </p>
        </div>

        {role === 'ADMIN' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/20 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Room</span>
          </button>
        )}
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {rooms.map((r) => (
          <div
            key={r.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                    Block {r.block} • Floor {r.floor}
                  </span>
                  <h3 className="text-xl font-black text-white mt-0.5">Room {r.room_number}</h3>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    r.active_anomalies_count > 0
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {r.active_anomalies_count > 0 ? 'ANOMALY' : 'NORMAL'}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Sensors:</span>
                  <span className="font-semibold text-white">{r.sensor_count} Nodes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Room Status:</span>
                  <span className="font-semibold text-cyan-400">{r.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Anomalies:</span>
                  <span className={r.active_anomalies_count > 0 ? 'font-bold text-red-400' : 'text-emerald-400'}>
                    {r.active_anomalies_count}
                  </span>
                </div>
              </div>
            </div>

            {role === 'ADMIN' && (
              <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  onClick={() => handleDeleteRoom(r.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Delete Room"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Room Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Add New Hostel Room</h3>
            <p className="text-xs text-slate-400 mb-4">Provision a new room to start IoT telemetry monitoring</p>

            {actionError && (
              <div className="p-3 mb-4 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-300">
                {actionError}
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Room Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 104"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hostel Block</label>
                  <input
                    type="text"
                    required
                    placeholder="A or B"
                    value={newBlock}
                    onChange={(e) => setNewBlock(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Floor Number</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={newFloor}
                    onChange={(e) => setNewFloor(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2.5"
                  />
                </div>
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
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 cursor-pointer"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
