import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckSquare, Cpu, Loader2, RefreshCw } from 'lucide-react';
import { PredictionRecord } from '../types/domain';
import { AiSnapshotResponse, requestSnapshotAiDiagnosis } from '../services/aiDiagnosticService';

interface AiDiagnosisPanelProps {
  record: PredictionRecord;
}

export const AiDiagnosisPanel: React.FC<AiDiagnosisPanelProps> = ({ record }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiSnapshotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset AI diagnosis whenever the user evaluates or opens a different record
  useEffect(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, [record.id]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestSnapshotAiDiagnosis(record);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate AI diagnosis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-900 dark:text-white">
              AI Maintenance Diagnosis
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Engineering explanation &amp; inspection checklist for this snapshot
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-500 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : result ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Regenerate</span>
            </>
          ) : (
            <span>Run AI Diagnosis</span>
          )}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300 flex items-start gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {result?.diagnosis && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3.5 text-xs">
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">Executive Summary</div>
            <p className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
              {result.diagnosis.executiveSummary}
            </p>
          </div>

          {Array.isArray(result.diagnosis.primaryRiskDrivers) &&
            result.diagnosis.primaryRiskDrivers.length > 0 && (
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Primary Risk Drivers</div>
                <ul className="mt-1 space-y-1 text-slate-700 dark:text-slate-300 list-disc list-inside leading-relaxed">
                  {result.diagnosis.primaryRiskDrivers.map((driver, idx) => (
                    <li key={idx}>{driver}</li>
                  ))}
                </ul>
              </div>
            )}

          {Array.isArray(result.diagnosis.inspectionChecklist) &&
            result.diagnosis.inspectionChecklist.length > 0 && (
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  Recommended Inspection Checklist
                </div>
                <ul className="mt-1.5 space-y-1.5">
                  {result.diagnosis.inspectionChecklist.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300 leading-relaxed">
                      <CheckSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {result.diagnosis.parameterGuidance && (
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">Operating Parameter Guidance</div>
              <p className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                {result.diagnosis.parameterGuidance}
              </p>
            </div>
          )}

          {result.diagnosis.scopeNote && (
            <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
              {result.diagnosis.scopeNote}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
