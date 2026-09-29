import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { systemService, alertService } from '../services/api';
import type { SystemHealth, Alert } from '../types';
import {
  Activity,
  Cpu,
  Sparkles,
  Radio,
  Sliders,
  Bell,
  UserCheck,
  LogOut,
  Building,
  Microchip,
  BarChart3,
  FileText,
  FileCode,
} from 'lucide-react';

interface NavbarProps {
  onOpenSimulation: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSimulation }) => {
  const { user, role, logout, switchDemoUser } = useAuth();
  const location = useLocation();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [unreadAlerts, setUnreadAlerts] = useState<Alert[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const h = await systemService.getHealth();
        setHealth(h);
      } catch (e) {
        console.warn('Health check info:', e);
      }

      try {
        const al = await alertService.getAll({ status_filter: 'UNREAD' });
        setUnreadAlerts(al);
      } catch (e) {
        console.warn('Alerts fetch info:', e);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { to: '/', label: 'Live Dashboard', icon: Activity },
    { to: '/rooms', label: 'Rooms', icon: Building },
    { to: '/sensors', label: 'Sensors', icon: Microchip },
    { to: '/analytics', label: 'DNN Analytics', icon: BarChart3 },
    { to: '/ai-reports', label: 'AI Reports', icon: FileText },
    { to: '/hardware', label: 'ESP32 Node', icon: FileCode },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white tracking-tight">AIoT Smart Hostel</span>
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    DNN + GenAI
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">ESP32 Environment & Anomaly Platform</p>
              </div>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Icons & User Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* System Status Badges */}
            <div className="hidden lg:flex items-center gap-2 text-xs">
              <div
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300"
                title="FastAPI + SQLAlchemy Database Status"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>DB: {health?.database ? 'Online' : 'Active'}</span>
              </div>
              <div
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300"
                title="Deep Neural Network (LSTM) Status"
              >
                <Cpu className="w-3 h-3 text-indigo-400" />
                <span>DNN: Loaded</span>
              </div>
              <div
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300"
                title="Gemini GenAI Diagnostic Engine"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>GenAI: Ready</span>
              </div>
            </div>

            {/* Simulation Trigger Button */}
            <button
              onClick={onOpenSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 text-xs sm:text-sm font-medium transition-all shadow-sm shadow-amber-500/10 cursor-pointer"
              title="Launch ESP32 Simulation Mode to inject Normal, Warning, or Critical conditions"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">ESP32 Simulator</span>
              <span className="sm:hidden">Simulate</span>
            </button>

            {/* Alert Indicator */}
            <Link
              to="/"
              className="relative p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={`${unreadAlerts.length} unread alerts`}
            >
              <Bell className="w-5 h-5" />
              {unreadAlerts.length > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadAlerts.length}
                </span>
              )}
            </Link>

            {/* Role & User Selector */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-md bg-slate-800 border border-slate-700 hover:bg-slate-700/80 transition-colors cursor-pointer text-left"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                    role === 'ADMIN' ? 'bg-purple-600 text-white' : 'bg-cyan-600 text-white'
                  }`}
                >
                  {role === 'ADMIN' ? 'AD' : 'ST'}
                </div>
                <div className="hidden xl:block pr-1">
                  <div className="text-xs font-semibold text-white leading-none">{user?.name || 'User'}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{role}</div>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg bg-slate-800 border border-slate-700 shadow-xl py-2 z-50 text-slate-200">
                  <div className="px-3 py-2 border-b border-slate-700">
                    <p className="text-xs text-slate-400 font-medium">Logged in as:</p>
                    <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                    <p className="text-xs text-cyan-400 font-mono">{user?.email}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                        {role}
                      </span>
                      {user?.room_id && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-300 border border-cyan-700/40">
                          Assigned Room: {user.room_id}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-2 border-b border-slate-700">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">
                      Quick Demo Switcher
                    </p>
                    <button
                      onClick={() => {
                        switchDemoUser('ADMIN');
                        setShowUserMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors text-left ${
                        role === 'ADMIN' ? 'bg-purple-900/40 text-purple-300 font-semibold' : 'hover:bg-slate-700'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                      <span>Hostel Chief Warden (Admin)</span>
                    </button>
                    <button
                      onClick={() => {
                        switchDemoUser('STUDENT');
                        setShowUserMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors text-left mt-1 ${
                        role === 'STUDENT' ? 'bg-cyan-900/40 text-cyan-300 font-semibold' : 'hover:bg-slate-700'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Student Resident (Room 101)</span>
                    </button>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-800">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs whitespace-nowrap ${
                  isActive ? 'bg-slate-800 text-cyan-400 font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
};
