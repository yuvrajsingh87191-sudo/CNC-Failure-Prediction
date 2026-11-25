import React, { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { TRACEABILITY_MATRIX, TraceStatus, USE_CASES } from '../data/projectData';

const STATUS_STYLE: Record<TraceStatus, string> = {
  Implemented: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  Tested: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  'Design Only': 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  'Future Enhancement': 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
};

export const RequirementsTraceabilityPage: React.FC = () => {
  const [category, setCategory] = useState<'ALL' | 'Functional' | 'Non-Functional'>('ALL');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return TRACEABILITY_MATRIX.filter((r) => {
      if (category !== 'ALL' && r.category !== category) return false;
      if (q) {
        return `${r.id} ${r.qualityOrPriority} ${r.description} ${r.designElement} ${r.implementation} ${r.testCases}`
          .toLowerCase()
          .includes(q);
      }
      return true;
    });
  }, [category, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Requirements & Traceability Matrix
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          End-to-end linkage from SRS (FR-01 to FR-08, NFR-01 to NFR-07) → Design → Implementation → Test Cases (Report §3.12).
        </p>
      </div>

      {/* Traceability Chain Visual */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold">
          {['SRS Requirement (FR / NFR)', 'SDD Design Element', 'Source Implementation', 'Verified Test Case (TC)'].map(
            (stage, idx) => (
              <React.Fragment key={stage}>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-slate-900 dark:text-white">
                  {stage}
                </div>
                {idx < 3 && <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />}
              </React.Fragment>
            )
          )}
        </div>
      </section>

      {/* Matrix Table */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {(['ALL', 'Functional', 'Non-Functional'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  category === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'ALL' ? 'All Requirements (15)' : cat === 'Functional' ? 'Functional (FR-01–08)' : 'Non-Functional (NFR-01–07)'}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search requirement or class..."
              aria-label="Search requirements traceability matrix"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
                <th className="py-3 px-4 whitespace-nowrap">Req. ID</th>
                <th className="py-3 px-3">Requirement & Acceptance</th>
                <th className="py-3 px-3">Design Element</th>
                <th className="py-3 px-3">Implementation</th>
                <th className="py-3 px-3 whitespace-nowrap">Test Cases</th>
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 align-top">
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-900 dark:text-white">{row.id}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {row.qualityOrPriority}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 max-w-sm">
                    <div className="text-slate-900 dark:text-slate-100 leading-relaxed">{row.description}</div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-medium">Criteria:</span> {row.acceptanceCriteria}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {row.designElement}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {row.implementation}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[11px] text-blue-700 dark:text-blue-400 whitespace-nowrap">
                    {row.testCases}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1.5">
                      {row.statuses.map((st) => (
                        <span
                          key={st}
                          className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[st]}`}
                        >
                          {st}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Use Cases Overview (SRS §2.6) */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          Documented Use Cases (SRS §2.6)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Actors: Maintenance Engineer (UC-01 to UC-05) and Production Supervisor (UC-03)
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {USE_CASES.map((uc) => (
            <div
              key={uc.id}
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{uc.id}</span>
                  <span className="text-slate-500 dark:text-slate-400">{uc.actor}</span>
                </div>
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white mt-1">
                  {uc.name}
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{uc.goal}</p>
                <ol className="mt-3 space-y-1 text-[11px] text-slate-600 dark:text-slate-400 list-decimal list-inside">
                  {uc.mainFlow.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Linked: {uc.requirements}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
