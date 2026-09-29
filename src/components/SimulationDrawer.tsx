import React, { useState } from 'react';
import { sensorService } from '../services/api';
import type { SensorIngestResponse } from '../types';
import {
  X,
  Send,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Wind,
  Droplets,
  Activity,
  Code,
  Radio,
} from 'lucide-react';

interface SimulationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onTelemetrySent: () => void;
}

export const SimulationDrawer: React.FC<SimulationDrawerProps> = ({ isOpen, onClose, onTelemetrySent }) => {
  const [roomId, setRoomId] = useState<number>(101);
  const [temperature, setTemperature] = useState<number>(27.5);
  const [humidity, setHumidity] = useState<number>(55.0);
  const [light, setLight] = useState<number>(450);
  const [motion, setMotion] = useState<number>(1);
  const [airQuality, setAirQuality] = useState<number>(42.0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<SensorIngestResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Preset Handlers conforming directly to Section 12 Specification
  const applyPreset = (mode: 'NORMAL' | 'WARNING_HEAT' | 'WARNING_HUMID' | 'CRITICAL_FIRE' | 'CRITICAL_STUFFY') => {
    switch (mode) {
      case 'NORMAL':
        setTemperature(27.8);
        setHumidity(54.0);
        setLight(450);
        setMotion(1);
        setAirQuality(42.0);
        break;
      case 'WARNING_HEAT':
        setTemperature(34.2);
        setHumidity(72.0);
        setLight(520);
        setMotion(1);
        setAirQuality(75.0);
        break;
      case 'WARNING_HUMID':
        setTemperature(28.5);
        setHumidity(86.0);
        setLight(220);
        setMotion(0);
        setAirQuality(60.0);
        break;
      case 'CRITICAL_FIRE':
        setTemperature(39.8);
        setHumidity(89.0);
        setLight(620);
        setMotion(1);
        setAirQuality(185.0);
        break;
      case 'CRITICAL_STUFFY':
        setTemperature(33.5);
        setHumidity(78.0);
        setLight(480);
        setMotion(1);
        setAirQuality(155.0);
        break;
    }
  };

  const handleTransmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await sensorService.ingest({
        room_id: roomId,
        temperature,
        humidity,
        light,
        motion,
        air_quality: airQuality,
        is_simulated: true,
      });
      setLastResult(res);
      onTelemetrySent();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Transmission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">ESP32 Hardware Simulator</h2>
                <p className="text-xs text-slate-400">Injects physical telemetry to FastAPI pipeline</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Target Room */}
          <div className="mt-5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Target Hostel Room
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[101, 102, 103, 201].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoomId(r)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    roomId === r
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Room {r}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mt-5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Standard Condition Presets (Section 12 Spec)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('NORMAL')}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 hover:bg-emerald-900/40 text-emerald-300 text-xs text-left transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <div className="font-bold">NORMAL</div>
                  <div className="text-[10px] text-emerald-400/80">27.8°C | 54% Hum | 42 ppm</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('WARNING_HEAT')}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/50 hover:bg-amber-900/40 text-amber-300 text-xs text-left transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div>
                  <div className="font-bold">WARNING: Heat</div>
                  <div className="text-[10px] text-amber-400/80">34.2°C | 72% Hum | Stuffy</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('WARNING_HUMID')}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/50 hover:bg-blue-900/40 text-blue-300 text-xs text-left transition-colors cursor-pointer"
              >
                <Droplets className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div>
                  <div className="font-bold">WARNING: Damp</div>
                  <div className="text-[10px] text-blue-400/80">28.5°C | 86% Hum (Mold)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('CRITICAL_FIRE')}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/40 border border-red-800/50 hover:bg-red-900/40 text-red-300 text-xs text-left transition-colors cursor-pointer"
              >
                <Flame className="w-4 h-4 text-red-400 flex-shrink-0" />
                <div>
                  <div className="font-bold">CRITICAL: Fire Risk</div>
                  <div className="text-[10px] text-red-400/80">39.8°C | 89% | 185 ppm</div>
                </div>
              </button>
            </div>
          </div>

          {/* Interactive Sliders */}
          <div className="mt-6 space-y-4 bg-slate-800/50 p-4 rounded-xl border border-slate-800">
            {/* Temperature */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-medium">DHT22 Temperature</span>
                <span className="font-mono font-bold text-cyan-400">{temperature.toFixed(1)} °C</span>
              </div>
              <input
                type="range"
                min="18"
                max="45"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>18°C (Cool)</span>
                <span className="text-amber-500">33°C (Warn)</span>
                <span className="text-red-500">37°C+ (Critical)</span>
              </div>
            </div>

            {/* Humidity */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-medium">DHT22 Humidity</span>
                <span className="font-mono font-bold text-blue-400">{humidity.toFixed(1)} %</span>
              </div>
              <input
                type="range"
                min="30"
                max="95"
                step="0.5"
                value={humidity}
                onChange={(e) => setHumidity(parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>30%</span>
                <span className="text-blue-400">45-65% (Optimal)</span>
                <span className="text-red-400">80%+ (Damp Hazard)</span>
              </div>
            </div>

            {/* Light */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-medium">LDR Light Intensity</span>
                <span className="font-mono font-bold text-amber-400">{light} Lux</span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                step="10"
                value={light}
                onChange={(e) => setLight(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* PIR Motion */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-xs text-slate-300 font-medium block">PIR Motion Sensor</span>
                <span className="text-[10px] text-slate-500">Human presence in room</span>
              </div>
              <button
                type="button"
                onClick={() => setMotion(motion ? 0 : 1)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  motion ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'
                }`}
              >
                {motion ? 'MOTION DETECTED (1)' : 'VACANT (0)'}
              </button>
            </div>

            {/* MQ-135 Air Quality */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-medium">MQ-135 Air Quality Index</span>
                <span className="font-mono font-bold text-purple-400">{airQuality.toFixed(1)} ppm</span>
              </div>
              <input
                type="range"
                min="20"
                max="250"
                step="1"
                value={airQuality}
                onChange={(e) => setAirQuality(parseFloat(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>&lt;50 (Clean)</span>
                <span className="text-purple-400">80-110 (Stuffy)</span>
                <span className="text-red-400">120+ (Smoke/VOC Danger)</span>
              </div>
            </div>
          </div>

          {/* JSON Payload Preview */}
          <div className="mt-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 font-mono">
              <Code className="w-3.5 h-3.5" />
              <span>HTTP POST /api/sensor-data Payload</span>
            </div>
            <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
              {JSON.stringify(
                {
                  room_id: roomId,
                  temperature: +temperature.toFixed(1),
                  humidity: +humidity.toFixed(1),
                  light,
                  motion,
                  air_quality: +airQuality.toFixed(1),
                  is_simulated: true,
                },
                null,
                2
              )}
            </pre>
          </div>

          {/* Response Inspector */}
          {lastResult && (
            <div
              className={`mt-4 p-3 rounded-lg border text-xs ${
                lastResult.is_anomaly
                  ? 'bg-red-950/30 border-red-800/60 text-red-200'
                  : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  {lastResult.is_anomaly ? <Flame className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  <span>{lastResult.is_anomaly ? `ANOMALY DETECTED: ${lastResult.anomaly_type}` : 'TELEMETRY ACCEPTED: NORMAL'}</span>
                </span>
                <span className="font-mono text-[11px]">Conf: {((typeof lastResult.confidence === 'number' ? lastResult.confidence : 0.85) * 100).toFixed(1)}%</span>
              </div>
              <div className="text-[11px] space-y-0.5 text-slate-300">
                <p>Status: {lastResult.status} | Data ID: #{lastResult.data_id}</p>
                {lastResult.alert_created && <p className="text-amber-300">⚠️ Active Alert Dispatched to Wardens</p>}
                {lastResult.ai_report_generated && <p className="text-cyan-300">✨ Gemini GenAI Root-Cause Diagnosis Generated</p>}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-xs text-red-300">
              Error: {errorMsg}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-800 mt-6">
          <button
            onClick={handleTransmit}
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Activity className="w-4 h-4 animate-spin" />
                <span>Transmitting Telemetry...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Telemetry to FastAPI</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
