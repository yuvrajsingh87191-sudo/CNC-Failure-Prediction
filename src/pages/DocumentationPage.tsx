import React from 'react';
import { BookOpen, GraduationCap, Users } from 'lucide-react';
import {
  DOCUMENTATION_CARDS,
  PROJECT_TEAM,
  RUBRIC_COVERAGE,
} from '../data/projectData';

export const DocumentationPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Project Documentation & Team
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Complete Software Engineering and AI/ML project deliverables, Group 8 team metadata, and evaluation rubric mapping.
        </p>
      </div>

      {/* Team & Institution Card */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs font-semibold">
              <GraduationCap className="h-4 w-4" />
              <span>Academic Submission Metadata</span>
            </div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {PROJECT_TEAM.project}
            </h2>
            <dl className="grid grid-cols-1 gap-2 text-xs pt-1">
              <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400">Course</dt>
                <dd className="font-medium text-slate-900 dark:text-white text-right">{PROJECT_TEAM.course}</dd>
              </div>
              <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400">Programme</dt>
                <dd className="font-medium text-slate-900 dark:text-white text-right">{PROJECT_TEAM.programme}</dd>
              </div>
              <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400">Institution</dt>
                <dd className="font-medium text-slate-900 dark:text-white text-right">{PROJECT_TEAM.institution}</dd>
              </div>
              <div className="flex justify-between gap-4 py-1.5">
                <dt className="text-slate-500 dark:text-slate-400">Report Version</dt>
                <dd className="font-mono text-slate-900 dark:text-white text-right">{PROJECT_TEAM.reportVersion}</dd>
              </div>
            </dl>
          </div>

          <div className="lg:col-span-7 lg:border-l lg:border-slate-200 lg:dark:border-slate-800 lg:pl-6">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white text-sm font-semibold mb-3">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Project Team — {PROJECT_TEAM.group}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PROJECT_TEAM.members.map((m) => (
                <div
                  key={m.enrolmentNo}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4"
                >
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Member 0{m.no}
                  </div>
                  <div className="font-display text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {m.name}
                  </div>
                  <div className="font-mono text-xs text-blue-700 dark:text-blue-400 mt-1">
                    {m.enrolmentNo}
                  </div>
                </div>
              ))}
            </div>

            {/* Rubric Summary */}
            <div className="mt-5">
              <div className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
                Evaluation Rubric Coverage (Report §7.3 · Total 15 Marks)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {RUBRIC_COVERAGE.map((r) => (
                  <div
                    key={r.component}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <span className="text-slate-700 dark:text-slate-300 truncate" title={r.component}>
                      {r.section}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">
                      {r.marks}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Project Deliverable Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOCUMENTATION_CARDS.map((doc) => (
          <div
            key={doc.title}
            className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono text-blue-700 dark:text-blue-400 font-semibold">
                  {doc.section}
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {doc.status}
                </span>
              </div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mt-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-slate-400 shrink-0" />
                <span>{doc.title}</span>
              </h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {doc.summary}
              </p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};
