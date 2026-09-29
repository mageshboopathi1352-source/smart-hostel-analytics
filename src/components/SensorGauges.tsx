import React from 'react';
import type { SensorData } from '../types';
import {
  Thermometer,
  Droplets,
  Sun,
  UserCheck,
  UserX,
  Wind,
  ShieldCheck,
  AlertTriangle,
  Flame,
} from 'lucide-react';

interface SensorGaugesProps {
  data: SensorData | null;
  roomNumber?: string;
}

export const SensorGauges: React.FC<SensorGaugesProps> = ({ data, roomNumber }) => {
  if (!data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-36 rounded-xl bg-slate-800/40 border border-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  // Threshold evaluations with safe numeric defaults
  const temp = typeof data?.temperature === 'number' ? data.temperature : 26.0;
  const hum = typeof data?.humidity === 'number' ? data.humidity : 50.0;
  const light = typeof data?.light === 'number' ? data.light : 350;
  const motion = typeof data?.motion === 'number' ? data.motion : (data?.motion ? 1 : 0);
  const airQ = typeof data?.air_quality === 'number'
    ? data.air_quality
    : typeof (data as any)?.airQuality === 'number'
    ? (data as any).airQuality
    : 45.0;

  // Temperature state
  const tempStatus =
    temp >= 37.0 ? { label: 'CRITICAL', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: Flame }
    : temp >= 33.0 ? { label: 'WARNING', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: AlertTriangle }
    : { label: 'OPTIMAL', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: ShieldCheck };

  // Humidity state
  const humStatus =
    hum >= 82.0 ? { label: 'DAMP / MOLD RISK', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' }
    : hum >= 70.0 ? { label: 'HIGH HUMIDITY', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' }
    : { label: 'COMFORTABLE', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };

  // Air Quality state
  const airStatus =
    airQ >= 130.0 ? { label: 'HAZARDOUS / SMOKE', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' }
    : airQ >= 90.0 ? { label: 'POOR / STUFFY', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' }
    : { label: 'FRESH / CLEAN', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Temperature Gauge */}
      <div className={`p-4 rounded-xl border backdrop-blur-sm transition-all shadow-sm ${tempStatus.bg}`}>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Thermometer className="w-4 h-4 text-cyan-400" />
            <span>Temperature</span>
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${tempStatus.bg} ${tempStatus.color}`}>
            {tempStatus.label}
          </span>
        </div>
        <div className="flex items-baseline gap-1 my-1">
          <span className={`text-3xl font-extrabold tracking-tight ${tempStatus.color}`}>
            {temp.toFixed(1)}
          </span>
          <span className="text-sm font-semibold text-slate-400">°C</span>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className={`h-full transition-all ${
              temp >= 37.0 ? 'bg-red-500' : temp >= 33.0 ? 'bg-amber-500' : 'bg-cyan-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(10, ((temp - 15) / 30) * 100))}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
          <span>Target: 24-28°C</span>
          <span>Sensor: DHT22</span>
        </div>
      </div>

      {/* 2. Humidity Gauge */}
      <div className={`p-4 rounded-xl border backdrop-blur-sm transition-all shadow-sm ${humStatus.bg}`}>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Droplets className="w-4 h-4 text-blue-400" />
            <span>Humidity</span>
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${humStatus.bg} ${humStatus.color}`}>
            {humStatus.label}
          </span>
        </div>
        <div className="flex items-baseline gap-1 my-1">
          <span className={`text-3xl font-extrabold tracking-tight ${humStatus.color}`}>
            {hum.toFixed(1)}
          </span>
          <span className="text-sm font-semibold text-slate-400">%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className={`h-full transition-all ${
              hum >= 80 ? 'bg-red-500' : hum >= 70 ? 'bg-amber-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(10, hum))}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
          <span>Comfort: 45-65%</span>
          <span>Sensor: DHT22</span>
        </div>
      </div>

      {/* 3. Ambient Light (LDR) */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 backdrop-blur-sm transition-all shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-amber-400" />
            <span>Ambient Light</span>
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {light > 600 ? 'BRIGHT' : light > 200 ? 'NORMAL STUDY' : 'DIM / NIGHT'}
          </span>
        </div>
        <div className="flex items-baseline gap-1 my-1">
          <span className="text-3xl font-extrabold tracking-tight text-amber-300">
            {light}
          </span>
          <span className="text-sm font-semibold text-slate-400">Lux</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className="h-full bg-amber-400 transition-all"
            style={{ width: `${Math.min(100, (light / 1000) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
          <span>ADC Pin: GPIO 34</span>
          <span>Sensor: LDR</span>
        </div>
      </div>

      {/* 4. PIR Motion Sensor */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 backdrop-blur-sm transition-all shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
            {motion ? <UserCheck className="w-4 h-4 text-indigo-400" /> : <UserX className="w-4 h-4 text-slate-500" />}
            <span>Occupancy</span>
          </span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
              motion
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {motion ? 'OCCUPIED' : 'VACANT'}
          </span>
        </div>
        <div className="flex items-baseline gap-1 my-1">
          <span className={`text-2xl font-extrabold tracking-tight ${motion ? 'text-indigo-400' : 'text-slate-400'}`}>
            {motion ? 'Motion Active' : 'No Movement'}
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className={`h-full transition-all ${motion ? 'bg-indigo-500 w-full' : 'bg-slate-700 w-1/12'}`}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
          <span>Logic: GPIO 27</span>
          <span>Sensor: HC-SR501</span>
        </div>
      </div>

      {/* 5. Air Quality (MQ-135) */}
      <div className={`p-4 rounded-xl border backdrop-blur-sm transition-all shadow-sm ${airStatus.bg}`}>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Wind className="w-4 h-4 text-purple-400" />
            <span>Air Quality / Gas</span>
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${airStatus.bg} ${airStatus.color}`}>
            {airStatus.label}
          </span>
        </div>
        <div className="flex items-baseline gap-1 my-1">
          <span className={`text-3xl font-extrabold tracking-tight ${airStatus.color}`}>
            {airQ.toFixed(1)}
          </span>
          <span className="text-sm font-semibold text-slate-400">ppm</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className={`h-full transition-all ${
              airQ >= 120 ? 'bg-red-500' : airQ >= 80 ? 'bg-amber-500' : 'bg-purple-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(10, (airQ / 250) * 100))}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
          <span>ADC Pin: GPIO 35</span>
          <span>Sensor: MQ-135</span>
        </div>
      </div>
    </div>
  );
};
