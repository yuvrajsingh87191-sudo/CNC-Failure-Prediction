import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { AlertCircle, CheckCircle2, Info, Search } from 'lucide-react';
import { DOCUMENTED_TEST_CASES, TestCaseRecord } from '../data/projectData';

export const TestingValidationPage: React.FC = () => {
  const [levelFilter, setLevelFilter] = useState<'ALL' | TestCaseRecord['level']>('ALL');
  const [search, setSearch] = useState('');

  const summary = useMemo(() => {
    const total = DOCUMENTED_TEST_CASES.length;
    const passed = DOCUMENTED_TEST_CASES.filter((t) => t.status === 'PASS').length;
    const failed = DOCUMENTED_TEST_CASES.filter((t) => t.status === 'FAIL').length;
    const notRun = DOCUMENTED_TEST_CASES.filter((t) => t.status === 'NOT RUN').length;

    const byLevel = [
      { level: 'Validation', count: DOCUMENTED_TEST_CASES.filter((t) => t.level === 'Unit: Validation').length },
      { level: 'Prediction', count: DOCUMENTED_TEST_CASES.filter((t) => t.level === 'Unit: Prediction').length },
      { level: 'Service/Int', count: DOCUMENTED_TEST_CASES.filter((t) => t.level === 'Service / Integration').length },
      { level: 'System/GUI', count: DOCUMENTED_TEST_CASES.filter((t) => t.level === 'System / Acceptance (GUI)').length },
    ];

    return { total, passed, failed, notRun, byLevel };
  }, []);

  const filteredTests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DOCUMENTED_TEST_CASES.filter((t) => {
      if (levelFilter !== 'ALL' && t.level !== levelFilter) return false;
      if (q) {
        return `${t.id} ${t.requirement} ${t.scenario} ${t.expected} ${t.actual}`.toLowerCase().includes(q);
      }
      return true;
    });
  }, [levelFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Testing & Validation Evidence
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Documented verification results from Section 6 of the Software Engineering Report (38 test cases).
        </p>
      </div>

      {/* Honest Disclosure Banner */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-900/70 bg-blue-50/70 dark:bg-blue-950/30 p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
          <span className="font-semibold">Evidence Source Note:</span> This dashboard displays the documented
          test results from the Java prototype (<code className="font-mono">cnc.LogicTests</code> &amp;{' '}
          <code className="font-mono">cnc.GuiTests</code> via <code className="font-mono">TestLog</code> on JDK 21 / Linux Xvfb). These automated Java suites are not executed inside the web browser.
        </p>
      </div>

      {/* Summary KPIs + Level Breakdown Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Test Cases</div>
            <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
              {summary.total}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              32 LogicTests · 6 GuiTests
            </div>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Passed</div>
            <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {summary.passed}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              100% pass rate (Run 2)
            </div>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Failed / Not Run</div>
            <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
              {summary.failed} / {summary.notRun}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              1 defect closed (DEF-01)
            </div>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">TC-26 Latency</div>
            <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-blue-700 dark:text-blue-400">
              ~30 ms
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              NFR-01 limit: &lt; 1,000 ms
            </div>
          </div>
        </div>

        <section className="lg:col-span-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Test Coverage by Strategy Level (Report §6.1)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Positive, negative, boundary, integration, and GUI acceptance verification
          </p>
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.byLevel} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" strokeOpacity={0.2} />
                <XAxis dataKey="level" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                  formatter={(v) => [`${v ?? 0} passed`, 'Cases']}
                />
                <Bar dataKey="count" fill="#16A34A" radius={[5, 5, 0, 0]} maxBarSize={52} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Filter + Complete 38 Test Cases Table */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                'ALL',
                'Unit: Validation',
                'Unit: Prediction',
                'Service / Integration',
                'System / Acceptance (GUI)',
              ] as const
            ).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevelFilter(lvl)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  levelFilter === lvl
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {lvl === 'ALL' ? 'All (38)' : lvl}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter TC ID, FR, description..."
              aria-label="Filter test cases"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
                <th className="py-3 px-4 whitespace-nowrap">Test ID</th>
                <th className="py-3 px-3 whitespace-nowrap">Req.</th>
                <th className="py-3 px-3">Test Description</th>
                <th className="py-3 px-3">Expected Result</th>
                <th className="py-3 px-3">Actual Result</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTests.map((tc) => (
                <tr key={tc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 align-top">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    {tc.id}
                    <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                      {tc.suite}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-blue-700 dark:text-blue-400 whitespace-nowrap">
                    {tc.requirement}
                  </td>
                  <td className="py-3 px-3 text-slate-800 dark:text-slate-200 max-w-xs">
                    {tc.scenario}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 max-w-xs">
                    {tc.expected}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300 max-w-xs">
                    {tc.actual}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{tc.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Defect Log & What Tests Do Not Cover */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Defects & Issues Found (Report §6.5)
          </h2>
          <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                DEF-01 · Found in TC-34 (GUI)
              </span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">Closed</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">What happened:</strong> First GUI run expected
              “NO FAILURE · RISK 3%” for dataset record 1, but the screen displayed 9%.
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong className="text-slate-900 dark:text-white">Cause &amp; action:</strong> The test expectation
              was a wrong hand-estimate. Working it out manually (heat-dissipation proximity 8.6 / 10.5 = 0.819
              gives 9.4%) confirmed the application code was right; the test expectation was corrected and Run 2 passed 6/6.
            </p>
          </div>
        </section>

        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              What the Prototype Tests Do Not Cover (Report §6.6)
            </h2>
          </div>
          <ul className="mt-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-400 list-disc list-inside leading-relaxed">
            <li>
              <strong className="text-slate-900 dark:text-white">Trained ML model quality:</strong> Recall,
              Precision, F1, and PR-AUC belong to the ML deliverable (NFR-07), not the rule-based stand-in.
            </li>
            <li>
              <strong className="text-slate-900 dark:text-white">Full CSV failure rows:</strong> TC-16/17 used
              real no-failure rows (UDI 1–5); TC-18..23 used rule-constructed failure snapshots because the full CSV was not loaded during the test run.
            </li>
            <li>
              <strong className="text-slate-900 dark:text-white">Clear-history Yes/No dialog automation:</strong>{' '}
              History deletion logic is tested in TC-30; the Java Swing Yes/No modal was verified manually rather than automated.
            </li>
            <li>
              <strong className="text-slate-900 dark:text-white">Unexpected predictor exceptions:</strong> Runtime
              errors thrown inside a future ML predictor are not yet wrapped in a dedicated UI recovery path.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};
