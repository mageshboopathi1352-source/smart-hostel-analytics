import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import type { SensorData } from '../types';

interface HistoricalChartsProps {
  data: SensorData[];
  roomNumber: string;
}

export const HistoricalCharts: React.FC<HistoricalChartsProps> = ({ data, roomNumber }) => {
  const chartData = data.map((d) => {
    const timeStr = new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return {
      time: timeStr,
      temperature: d.temperature,
      humidity: d.humidity,
      light: d.light,
      airQuality: d.air_quality || 45.0,
      motion: d.motion,
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Temperature & Humidity Chart */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Temperature & Humidity Dynamics</h3>
            <p className="text-xs text-slate-400">Sliding temporal history for Room {roomNumber}</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-cyan-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span> Temp (°C)
            </span>
            <span className="flex items-center gap-1 text-blue-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"></span> Humidity (%)
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
              />
              <Line
                type="monotone"
                dataKey="temperature"
                name="Temperature (°C)"
                stroke="#06b6d4"
                strokeWidth={2.5}
                dot={{ r: 2, fill: '#06b6d4' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="humidity"
                name="Humidity (%)"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 2, fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Air Quality & Ambient Light Chart */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">MQ-135 Gas & LDR Light Levels</h3>
            <p className="text-xs text-slate-400">Indoor air freshness index and ambient illumination</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-purple-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block"></span> Air Quality (ppm)
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> Light (Lux)
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorAir" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
              />
              <Area
                type="monotone"
                dataKey="airQuality"
                name="Air Quality (ppm)"
                stroke="#a855f7"
                fillOpacity={1}
                fill="url(#colorAir)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="light"
                name="Ambient Light (Lux)"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
