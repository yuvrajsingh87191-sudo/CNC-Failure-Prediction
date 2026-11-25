import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { RiskLevel } from '../types/domain';

interface RiskGaugeProps {
  riskPercent: number;
  level: RiskLevel;
  failureExpected: boolean;
  advice: string;
  compact?: boolean;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  riskPercent,
  level,
  failureExpected,
  advice,
  compact = false,
}) => {
  const clamped = Math.max(0, Math.min(100, riskPercent));
  const radius = 84;
  const strokeWidth = 14;
  const cx = 110;
  const cy = 104;
  const circumference = Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  const strokeColor =
    level === RiskLevel.HIGH
      ? '#DC2626'
      : level === RiskLevel.MEDIUM
      ? '#D97706'
      : '#16A34A';

  const statusTextColor =
    level === RiskLevel.HIGH
      ? 'text-red-700 dark:text-red-400'
      : level === RiskLevel.MEDIUM
      ? 'text-amber-700 dark:text-amber-400'
      : 'text-emerald-700 dark:text-emerald-400';

  const statusBg =
    level === RiskLevel.HIGH
      ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/70'
      : level === RiskLevel.MEDIUM
      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/70'
      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/70';

  // Calculate tick positions for 30% and 50%
  const pointOnArc = (pct: number, r: number) => {
    const angle = Math.PI - (pct / 100) * Math.PI;
    return {
      x: cx + r * Math.cos(angle),
      y: cy - r * Math.sin(angle),
    };
  };

  const t30In = pointOnArc(30, radius - 10);
  const t30Out = pointOnArc(30, radius + 10);
  const t50In = pointOnArc(50, radius - 10);
  const t50Out = pointOnArc(50, radius + 10);

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${compact ? 'w-48' : 'w-56'} select-none`}>
        <svg viewBox="0 0 220 124" className="w-full h-auto overflow-visible" role="img" aria-label={`Machine failure risk ${Math.round(clamped)} percent, ${level} risk`}>
          {/* Background track */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Active arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 400ms cubic-bezier(0.16, 1, 0.3, 1)' }}
          />

          {/* Threshold markers at 30% (MEDIUM) and 50% (HIGH/FAILURE) */}
          <line
            x1={t30In.x}
            y1={t30In.y}
            x2={t30Out.x}
            y2={t30Out.y}
            className="stroke-slate-400 dark:stroke-slate-500"
            strokeWidth="1.5"
          />
          <line
            x1={t50In.x}
            y1={t50In.y}
            x2={t50Out.x}
            y2={t50Out.y}
            className="stroke-slate-600 dark:stroke-slate-300"
            strokeWidth="2"
          />

          {/* Scale labels */}
          <text x="16" y="119" className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono">0%</text>
          <text x="101" y="10" className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono">50%</text>
          <text x="182" y="119" className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono">100%</text>

          {/* Center percentage readout */}
          <text
            x={cx}
            y={cy - 18}
            textAnchor="middle"
            className="fill-slate-900 dark:fill-white font-mono font-bold text-[32px] tabular-nums"
          >
            {Math.round(clamped)}%
          </text>
          <text
            x={cx}
            y={cy + 2}
            textAnchor="middle"
            className="fill-slate-500 dark:fill-slate-400 text-[11px] font-medium"
          >
            {clamped.toFixed(1)}% computed risk
          </text>
        </svg>
      </div>

      {/* Explicit Text Status (Never Color-Only) */}
      <div className="mt-2 text-center space-y-2 w-full">
        <div className={`inline-flex items-center gap-1.5 font-display font-bold text-sm tracking-wide ${statusTextColor}`}>
          {failureExpected ? (
            <ShieldAlert className="h-4 w-4 shrink-0" />
          ) : level === RiskLevel.MEDIUM ? (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span>{failureExpected ? 'FAILURE RISK' : 'NO FAILURE'}</span>
          <span aria-hidden="true">·</span>
          <span>{level} RISK</span>
        </div>

        <div className={`rounded-lg border px-3.5 py-2.5 text-xs font-medium leading-relaxed ${statusBg} ${statusTextColor}`}>
          {advice}
        </div>
      </div>
    </div>
  );
};
