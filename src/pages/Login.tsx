import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { Cpu, Lock, Mail, UserCheck, ShieldCheck, User } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [roleName, setRoleName] = useState('STUDENT');
  const [roomId, setRoomId] = useState('101');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      if (isRegister) {
        await authService.register({
          name,
          email,
          password,
          role_name: roleName,
          room_id: roleName === 'STUDENT' ? parseInt(roomId, 10) : undefined,
        });
        await login(email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickDemoLogin = async (demoEmail: string, demoPass: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await login(demoEmail, demoPass);
      navigate('/');
    } catch (err: any) {
      setErrorMsg('Demo login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-cyan-500/20">
          <Cpu className="w-6 h-6" />
        </div>
        <h2 className="mt-4 text-2xl font-black text-white tracking-tight">AIoT Smart Hostel</h2>
        <p className="mt-1 text-xs text-slate-400">
          Environment Analytics & DNN Anomaly Prediction Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Quick Demo Selector */}
        <div className="mb-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            One-Click Demo Access
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => quickDemoLogin('admin@smarthostel.edu', 'Admin@123')}
              className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/60 hover:bg-purple-900/50 text-purple-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer text-left"
            >
              <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div>
                <div className="font-bold">Chief Warden</div>
                <div className="text-[10px] text-purple-400/80">Full Facility Admin</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => quickDemoLogin('student101@smarthostel.edu', 'Student@123')}
              className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/60 hover:bg-cyan-900/50 text-cyan-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer text-left"
            >
              <UserCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div>
                <div className="font-bold">Resident Student</div>
                <div className="text-[10px] text-cyan-400/80">Room 101 Access</div>
              </div>
            </button>
          </div>
        </div>

        {/* Standard Form */}
        <div className="bg-slate-900 py-8 px-6 shadow-xl rounded-2xl border border-slate-800 sm:px-10">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="admin@smarthostel.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            {isRegister && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
                  <select
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5"
                  >
                    <option value="STUDENT">STUDENT</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                {roleName === 'STUDENT' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Room</label>
                    <input
                      type="number"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5"
                    />
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition-all disabled:opacity-50 cursor-pointer mt-2"
            >
              {isSubmitting
                ? 'Processing...'
                : isRegister
                ? 'Create Hostel Account'
                : 'Sign In to Smart Hostel'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMsg(null);
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              {isRegister
                ? 'Already have an account? Sign in'
                : "Don't have an account? Register new user"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
