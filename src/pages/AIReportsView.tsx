import React, { useState, useEffect } from 'react';
import { genaiService, roomService } from '../services/api';
import type { AIReport, Room } from '../types';
import { Sparkles, Building, Filter, Clock, HelpCircle, Lightbulb, ShieldAlert } from 'lucide-react';

export const AIReportsView: React.FC = () => {
  const [reports, setReports] = useState<AIReport[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<number>(101);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const rList = await roomService.getAll();
        setRooms(rList);
        if (rList.length > 0) setSelectedRoom(rList[0].id);
      } catch (e) {
        console.error(e);
      }
    };
    fetchRooms();
  }, []);

  useEffect(() => {
    const fetchReports = async () => {
      if (!selectedRoom) return;
      setIsLoading(true);
      try {
        const data = await genaiService.getReportsForRoom(selectedRoom);
        setReports(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, [selectedRoom]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-700/50">
              Gemini GenAI
            </span>
            <span className="text-xs text-slate-500 font-mono">Backend Service Invocations</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span>Facility GenAI Root-Cause & Action Reports</span>
          </h1>
        </div>

        {/* Room Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400">Filter Room:</span>
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(parseInt(e.target.value, 10))}
            className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-2 cursor-pointer focus:ring-1 focus:ring-purple-500"
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                Room {r.room_number} (Block {r.block})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800">
          <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-300">No AI Reports for Room {selectedRoom}</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            When anomalies occur in Room {selectedRoom}, the backend automatically requests Gemini to produce root-cause explanations.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    Diagnostic Assessment #{rep.id} (Anomaly Ref #{rep.anomaly_id})
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(rep.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Overview */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Situation Analysis</span>
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-800/60 text-slate-200 text-xs sm:text-sm leading-relaxed">
                  {rep.explanation}
                </div>
              </div>

              {/* 2-Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Possible Causes</span>
                  </h4>
                  <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/30 text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                    {rep.possible_causes}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                    <Lightbulb className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Recommended Corrective Actions</span>
                  </h4>
                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30 text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                    {rep.recommendation}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
