import React from 'react';
import type { AIReport, Anomaly } from '../types';
import {
  Sparkles,
  AlertTriangle,
  Flame,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  ShieldAlert,
} from 'lucide-react';

interface AIReportCardProps {
  report: AIReport | null;
  anomaly?: Anomaly | null;
  onGenerateReport?: () => void;
  isLoading?: boolean;
}

export const AIReportCard: React.FC<AIReportCardProps> = ({
  report,
  anomaly,
  onGenerateReport,
  isLoading,
}) => {
  if (!report && !anomaly) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center py-10">
        <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-300">No Active Environmental Anomalies</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          When the LSTM Deep Neural Network detects abnormal telemetry shifts, Gemini Generative AI will analyze the root cause and provide actionable recommendations.
        </p>
      </div>
    );
  }

  if (!report && anomaly) {
    return (
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-amber-950/20 border border-amber-800/40 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase text-amber-400 font-bold">
                {anomaly.severity} DETECTED
              </span>
              <h3 className="text-base font-bold text-white">{anomaly.anomaly_type}</h3>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-800 text-cyan-300 border border-slate-700">
            Conf: {((typeof anomaly.confidence === 'number' ? anomaly.confidence : 0.85) * 100).toFixed(1)}%
          </span>
        </div>
        <p className="text-xs text-slate-300 mb-4">{anomaly.description}</p>

        {onGenerateReport && (
          <button
            onClick={onGenerateReport}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isLoading ? 'Generating Gemini Diagnosis...' : 'Generate GenAI Diagnostic Report'}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 border border-indigo-900/40 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Gemini GenAI Diagnostic Report
              </span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-700/40">
                gemini-3.8-flash
              </span>
            </div>
            <h3 className="text-base font-bold text-white">Root-Cause Analysis & Action Plan</h3>
          </div>
        </div>
        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
          Report #{report?.id} • {report ? new Date(report.created_at).toLocaleTimeString() : ''}
        </span>
      </div>

      <div className="mt-4 space-y-4 relative z-10">
        {/* Situation Overview */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
            <span>Situation Overview</span>
          </h4>
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-800 text-slate-200 text-xs sm:text-sm leading-relaxed">
            {report?.explanation}
          </div>
        </div>

        {/* 2-Column: Causes & Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Possible Causes */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Identified Potential Causes</span>
            </h4>
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/30 text-xs sm:text-sm text-slate-300 whitespace-pre-line leading-relaxed">
              {report?.possible_causes}
            </div>
          </div>

          {/* Action Recommendations */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-emerald-400" />
              <span>Prioritized Recommendations</span>
            </h4>
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30 text-xs sm:text-sm text-slate-300 whitespace-pre-line leading-relaxed">
              {report?.recommendation}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
