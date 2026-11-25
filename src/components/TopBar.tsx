import React, { useState, useRef, useEffect } from 'react';
import { Bell, LogOut, Menu, Moon, Sun, User, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { NavSectionId, PredictionRecord, PredictorMode, UserPersona } from '../types/domain';
import { AuthUser } from '../services/authService';
import { formatShortTime } from '../utils/formatters';

interface TopBarProps {
  activeSection: NavSectionId;
  onOpenMobile: () => void;
  authUser: AuthUser;
  onLogout: () => void;
  persona: UserPersona;
  onChangePersona: (p: UserPersona) => void;
  predictorMode: PredictorMode;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  recentRecords: PredictionRecord[];
  onNavigate: (section: NavSectionId) => void;
}

const SECTION_LABELS: Record<NavSectionId, string> = {
  dashboard: 'Dashboard',
  predict: 'Predict Failure',
  history: 'Prediction History',
  analytics: 'Analytics',
  'ai-intelligence': 'AI Intelligence',
  'model-performance': 'Model Performance',
  testing: 'Testing & Validation',
  traceability: 'Requirements & Traceability',
  architecture: 'System Architecture',
  documentation: 'Documentation',
  settings: 'Settings / About',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  onOpenMobile,
  authUser,
  onLogout,
  persona,
  onChangePersona,
  predictorMode,
  darkMode,
  onToggleDarkMode,
  recentRecords,
  onNavigate,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const highRiskCount = recentRecords.filter((r) => r.prediction.failureExpected).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Trigger + Project Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Open navigation menu"
          className="lg:hidden rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden sm:inline font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            CNC Machine Failure Prediction
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-600" aria-hidden="true">
            /
          </span>
          <span className="font-display font-semibold text-slate-900 dark:text-white truncate">
            {SECTION_LABELS[activeSection]}
          </span>
        </div>
      </div>

      {/* Right: Predictor Context + Status Popover + Theme Toggle + Demo Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pr-2 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
          <span className={predictorMode === 'ml-model' ? 'font-medium text-blue-700 dark:text-blue-400' : ''}>
            {predictorMode === 'ml-model'
              ? 'Engine: Random Forest ML (150 trees)'
              : 'Engine: Rule-Based Prototype'}
          </span>
          <span aria-hidden="true">·</span>
          <span>Local Storage</span>
        </div>

        {/* Recent Alerts / Status Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen((o) => !o);
              setProfileOpen(false);
            }}
            aria-label="System alerts and recent predictions"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Bell className="h-4 w-4" />
            {highRiskCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-mono font-semibold text-white">
                {highRiskCount > 9 ? '9+' : highRiskCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Session Activity
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  {recentRecords.length} saved
                </span>
              </div>

              {recentRecords.length === 0 ? (
                <p className="py-4 text-xs text-slate-500 dark:text-slate-400">
                  No predictions recorded yet. Run a prediction to populate session alerts.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto my-1">
                  {recentRecords.slice(0, 5).map((rec) => (
                    <li key={rec.id} className="py-2.5 flex items-start gap-2.5 text-xs">
                      {rec.prediction.failureExpected ? (
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {rec.prediction.headline}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          Type {rec.reading.type} · {formatShortTime(rec.timestamp)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Offline demo mode
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen(false);
                    onNavigate('history');
                  }}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Open History
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Operator Profile & Sign Out */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setProfileOpen((o) => !o);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 dark:bg-blue-600 text-white shrink-0">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap max-w-[140px] truncate">
                {authUser.name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {persona}
              </div>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg p-3 z-50">
              <div className="px-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {authUser.name}
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {authUser.email}
                </div>
              </div>
              <div className="px-2 pb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Active Operational Role
              </div>
              {(['Maintenance Engineer', 'Production Supervisor'] as UserPersona[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    onChangePersona(role);
                    setProfileOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${
                    persona === role
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div>{role}</div>
                  <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    {role === 'Maintenance Engineer'
                      ? 'UC-01 to UC-05 · Predict, validate & manage history'
                      : 'UC-03 · Review risk trends & inspection history'}
                  </div>
                </button>
              ))}
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
