import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  RotateCcw,
  ExternalLink,
  Laptop,
  Terminal,
  Bug,
  Filter,
  Check,
  Play,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Platform } from '../../types';

export const PublishingView: React.FC = () => {
  const {
    jobs,
    events,
    brands,
    retryPublish,
    publisherMode,
    setPublisherMode,
    isFailureSimulated,
    toggleSimulatedFailure,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');

  const filteredJobs = jobs.filter((j) => {
    if (statusFilter !== 'ALL' && j.status !== statusFilter) return false;
    if (platformFilter !== 'ALL' && j.platform !== platformFilter) return false;
    return true;
  });

  const queuedCount = jobs.filter((j) => j.status === 'QUEUED' || j.status === 'CLAIMED' || j.status === 'STAGED').length;
  const publishingCount = jobs.filter((j) => j.status === 'PUBLISHING').length;
  const publishedCount = jobs.filter((j) => j.status === 'PUBLISHED').length;
  const failedCount = jobs.filter((j) => j.status === 'FAILED').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Publishing Queue & Worker Telemetry</h1>
          <p className="text-xs text-slate-500">
            Real-time tracking of AutoSocial Playwright browser executions and dispatch states
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-xs text-xs font-bold">
          <button
            onClick={() => setPublisherMode('mock')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              publisherMode === 'mock'
                ? 'bg-[#0B192C] text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Mock Simulator
          </button>
          <button
            onClick={() => setPublisherMode('autosocial')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              publisherMode === 'autosocial'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Live AutoSocial Daemon
          </button>
        </div>
      </div>

      {/* Operator Diagnostics & Testing Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <Bug className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              <span>Adapter Error Simulator</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                Testing Utility
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Toggle simulated failure on a platform to verify the retry and independent status engine:
            </p>
          </div>
        </div>

        {/* Platform Error Simulation Toggles */}
        <div className="flex items-center gap-2">
          {(['instagram', 'tiktok', 'youtube'] as Platform[]).map((plat) => {
            const isFailing = isFailureSimulated(plat);
            return (
              <button
                key={plat}
                onClick={() => toggleSimulatedFailure(plat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer border ${
                  isFailing
                    ? 'bg-rose-950/80 text-rose-300 border-rose-700 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {isFailing ? `Simulating ${plat} Error` : `${plat} Normal`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Queue Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Queued / Staged</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{queuedCount}</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Publishing</span>
            <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
          </div>
          <div className="text-xl font-black text-amber-600">{publishingCount}</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Published</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600">{publishedCount}</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Failed</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-600">{failedCount}</div>
        </div>
      </div>

      {/* Split View: Live Jobs List & Telemetry Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Jobs Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900">Publishing Dispatch Queue</h3>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 font-medium text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="QUEUED">Queued</option>
                <option value="PUBLISHING">Publishing</option>
                <option value="PUBLISHED">Published</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {filteredJobs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active jobs in the queue matching criteria.
              </div>
            ) : (
              filteredJobs.map((job) => {
                const brand = brands.find((b) => b.id === job.brandId);

                return (
                  <div
                    key={job.id}
                    className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase"
                          style={{ backgroundColor: brand?.color || '#0B192C' }}
                        >
                          {brand?.name}
                        </span>
                        <span className="font-mono text-xs font-bold capitalize text-slate-800">
                          {job.platform}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 truncate">
                          {job.accountHandle}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Job: {job.id} | {new Date(job.createdAt).toLocaleTimeString()}
                      </div>
                      {job.errorMessage && (
                        <div className="text-[11px] text-rose-600 font-medium mt-1">
                          {job.errorMessage}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                          job.status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : job.status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : job.status === 'PUBLISHING'
                            ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {job.status}
                      </span>

                      {job.status === 'FAILED' && (
                        <button
                          onClick={() => retryPublish(job.contentId, job.platform)}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      )}

                      {job.postUrl && (
                        <a
                          href={job.postUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 5 Cols: Real-Time Worker Events Stream */}
        <div className="lg:col-span-5 bg-slate-950 rounded-2xl border border-slate-800 shadow-sm p-4 flex flex-col justify-between text-white font-mono text-xs">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <span className="flex items-center gap-2 font-bold text-slate-200">
                <Terminal className="w-4 h-4 text-amber-400" />
                Live Worker Telemetry Stream
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                STREAMING
              </span>
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {events.length === 0 ? (
                <div className="text-slate-600 italic text-center py-12">
                  No execution events recorded yet. Dispatch a post or run simulation to view real-time steps.
                </div>
              ) : (
                events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-amber-400 font-bold uppercase">{evt.platform}</span>
                      <span className="text-slate-500">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour12: false })}
                      </span>
                    </div>
                    <div
                      className={`text-[11px] leading-relaxed ${
                        evt.level === 'error'
                          ? 'text-rose-400'
                          : evt.level === 'success'
                          ? 'text-emerald-300 font-bold'
                          : 'text-slate-300'
                      }`}
                    >
                      [{evt.step}] {evt.message}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
            <span>Machine: WIN11-OPERATOR-01</span>
            <span>Target: AutoSocial Playwright</span>
          </div>
        </div>
      </div>
    </div>
  );
};
