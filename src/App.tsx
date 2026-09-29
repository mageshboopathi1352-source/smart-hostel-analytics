import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { SimulationDrawer } from './components/SimulationDrawer';
import { Dashboard } from './pages/Dashboard';
import { RoomsView } from './pages/RoomsView';
import { SensorsView } from './pages/SensorsView';
import { AnalyticsView } from './pages/AnalyticsView';
import { AIReportsView } from './pages/AIReportsView';
import { HardwareFirmwareView } from './pages/HardwareFirmwareView';
import { Login } from './pages/Login';
import { Sliders, Cpu, Activity } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [telemetryTrigger, setTelemetryTrigger] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 gap-2">
        <Activity className="w-5 h-5 animate-spin text-cyan-400" />
        <span className="text-sm font-semibold">Connecting to Smart Hostel AIoT Platform...</span>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Header */}
      <Navbar onOpenSimulation={() => setIsSimulationOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                key={telemetryTrigger}
                onOpenSimulation={() => setIsSimulationOpen(true)}
              />
            }
          />
          <Route path="/rooms" element={<RoomsView />} />
          <Route path="/sensors" element={<SensorsView />} />
          <Route path="/analytics" element={<AnalyticsView />} />
          <Route path="/ai-reports" element={<AIReportsView />} />
          <Route path="/hardware" element={<HardwareFirmwareView />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Hardware Simulation Drawer */}
      <SimulationDrawer
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
        onTelemetrySent={() => setTelemetryTrigger((prev) => prev + 1)}
      />

      {/* Floating Simulation Trigger for fast mobile / tablet access */}
      <button
        onClick={() => setIsSimulationOpen(true)}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs shadow-xl shadow-amber-500/20 hover:scale-105 transition-all cursor-pointer"
      >
        <Sliders className="w-4 h-4" />
        <span>ESP32 Simulator</span>
      </button>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AIoT Smart Hostel Environment Analytics & Anomaly Prediction</span>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
            <span>FastAPI + MySQL/SQLite</span>
            <span>•</span>
            <span>LSTM Sequence Model (80% Acc)</span>
            <span>•</span>
            <span>Gemini 3.8 Flash</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
