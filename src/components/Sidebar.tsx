import React from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CheckSquare,
  Cpu,
  GitBranch,
  History,
  LayoutDashboard,
  Layers,
  Settings,
  X,
} from 'lucide-react';
import { NavSectionId, PredictorMode } from '../types/domain';

interface SidebarProps {
  activeSection: NavSectionId;
  onSelect: (section: NavSectionId) => void;
  historyCount: number;
  predictorMode: PredictorMode;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavGroup {
  label: string;
  items: {
    id: NavSectionId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    meta?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelect,
  historyCount,
  predictorMode,
  mobileOpen,
  onCloseMobile,
}) => {
  const navGroups: NavGroup[] = [
    {
      label: 'Operations',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'predict', label: 'Predict Failure', icon: Activity },
        {
          id: 'history',
          label: 'Prediction History',
          icon: History,
          meta: historyCount > 0 ? String(historyCount) : undefined,
        },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      ],
    },
    {
      label: 'AI, ML & Engineering',
      items: [
        { id: 'ai-intelligence', label: 'AI Intelligence', icon: BrainCircuit },
        { id: 'model-performance', label: 'Model Performance', icon: Cpu },
        { id: 'testing', label: 'Testing & Validation', icon: CheckSquare, meta: '38' },
        { id: 'traceability', label: 'Requirements & Traceability', icon: GitBranch },
        { id: 'architecture', label: 'System Architecture', icon: Layers },
      ],
    },
    {
      label: 'Project',
      items: [
        { id: 'documentation', label: 'Documentation', icon: BookOpen },
        { id: 'settings', label: 'Settings / About', icon: Settings },
      ],
    },
  ];

  const handleNavClick = (id: NavSectionId) => {
    onSelect(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0B1324] text-slate-200 border-r border-slate-800/80">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-display font-bold text-sm tracking-tight">
            CNC
          </div>
          <div className="min-w-0">
            <div className="font-display font-semibold text-sm text-white truncate tracking-tight">
              CNC Failure Predictor
            </div>
            <div className="text-xs text-slate-400 truncate">
              Group 8 · NIIT University
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Sections */}
      <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-2 text-xs font-medium text-slate-400/90">
              {group.label}
            </div>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? 'text-white' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.meta && (
                        <span
                          className={`text-xs font-mono tabular-nums shrink-0 ${
                            isActive ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          {item.meta}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Subtle Footer Context */}
      <div className="px-5 py-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
        <div className="font-medium text-slate-200">
          {predictorMode === 'ml-model' ? 'Trained ML Engine Active' : 'Prototype Stand-In Active'}
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          {predictorMode === 'ml-model'
            ? 'RandomForest · 150 trees · τ=0.26'
            : 'RuleBasedPredictor · AI4I 2020'}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[82vw] h-full z-10">{sidebarContent}</aside>
        </div>
      )}
    </>
  );
};
