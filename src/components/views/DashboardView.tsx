import React from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Share2,
  TrendingUp,
  Plus,
  Play,
  RotateCcw,
  ExternalLink,
  Laptop,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PlatformBadge } from '../PlatformBadge';
import { NavTab } from '../Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  onOpenCreate: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenCreate }) => {
  const {
    brands,
    selectedBrandId,
    contentList,
    accounts,
    jobs,
    publishNow,
    retryPublish,
    setSelectedContentItem,
    publisherMode,
  } = useApp();

  // Filter content by selected brand if any
  const filteredContent =
    selectedBrandId === 'ALL'
      ? contentList
      : contentList.filter((c) => c.brandId === selectedBrandId);

  // Metrics calculations
  const today = new Date().toISOString().slice(0, 10);
  const postsToday = filteredContent.filter(
    (c) => c.createdAt.slice(0, 10) === today || c.updatedAt.slice(0, 10) === today
  ).length;

  const scheduledCount = filteredContent.filter((c) => c.status === 'SCHEDULED').length;
  const publishedCount = filteredContent.filter((c) => c.status === 'PUBLISHED').length;
  const failedCount = filteredContent.filter((c) => c.status === 'FAILED' || c.status === 'PARTIAL').length;
  const connectedAccountsCount = accounts.filter((a) => a.connectionStatus === 'CONNECTED').length;

  // Active or recent jobs
  const recentJobs = jobs.slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-[#0B192C] to-[#1E3E62] rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Subtle geometric pattern */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold mb-3 uppercase tracking-wider">
              <span>Johannesburg Operations Desk</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2">
              Social Command Center
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Distribute short-form video creative across Instagram Reels, TikTok, and YouTube Shorts. Jobs stage securely to your local Windows AutoSocial worker without cloud password storage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('import')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 backdrop-blur transition-all cursor-pointer"
            >
              Batch CSV Import
            </button>
            <button
              onClick={onOpenCreate}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E65100] to-[#F5A623] hover:from-[#BF360C] hover:to-[#E65100] text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Post</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards (Posts today, Scheduled, Published, Failed, Connected accounts) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Posts Today */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Posts Today</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{postsToday}</div>
          <div className="text-[11px] text-slate-400 mt-1">Activity in current cycle</div>
        </div>

        {/* Scheduled */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Scheduled</span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">{scheduledCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Pending queue dispatches</div>
        </div>

        {/* Published */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Published</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{publishedCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Verified live posts</div>
        </div>

        {/* Failed */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Failed / Partial</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">{failedCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Eligible for retry</div>
        </div>

        {/* Connected Accounts */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Accounts</span>
            <Share2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{connectedAccountsCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Local persistent profiles</div>
        </div>
      </div>

      {/* Main Split: Recent Content & Live Queue Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Content Table Preview */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Active Social Content</h2>
              <p className="text-xs text-slate-500">Track independent per-platform publishing outcomes</p>
            </div>
            <button
              onClick={() => onNavigate('content')}
              className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
            >
              <span>View All Content</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {filteredContent.slice(0, 5).map((item) => {
              const brand = brands.find((b) => b.id === item.brandId);
              const hasFailure = item.platforms.some((p) => item.platformStatus[p] === 'FAILED');

              return (
                <div
                  key={item.id}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4"
                >
                  {/* Left: Thumbnail & Title */}
                  <div className="flex items-center gap-3.5 min-w-0 max-w-sm">
                    <div className="relative w-12 h-16 rounded-lg bg-slate-900 overflow-hidden flex-shrink-0 border border-slate-200 shadow-xs">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video src={item.videoUrl} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Play className="w-3.5 h-3.5 text-white/90 fill-white/80" />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded text-white"
                          style={{ backgroundColor: brand?.color || '#0B192C' }}
                        >
                          {brand?.name}
                        </span>
                        {item.scheduledAt && (
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(item.scheduledAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 truncate leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{item.caption}</p>
                    </div>
                  </div>

                  {/* Middle: Independent Platform Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 justify-end">
                    {item.platforms.map((plat) => (
                      <PlatformBadge
                        key={plat}
                        platform={plat}
                        status={item.platformStatus[plat]}
                        postUrl={item.platformPostUrls?.[plat]}
                        errorMessage={item.platformErrors?.[plat]}
                        onRetry={() => retryPublish(item.id, plat)}
                      />
                    ))}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setSelectedContentItem(item)}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                    >
                      Preview
                    </button>
                    {hasFailure ? (
                      <button
                        onClick={() => retryPublish(item.id)}
                        className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Retry</span>
                      </button>
                    ) : item.status !== 'PUBLISHED' ? (
                      <button
                        onClick={() => publishNow(item.id)}
                        className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                      >
                        Post
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Worker & Queue Status */}
        <div className="space-y-4">
          {/* Worker Health Card */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-slate-800" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Local Windows Daemon
                </h3>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2 mb-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Active Engine:</span>
                <span className="font-bold text-slate-800">
                  {publisherMode === 'mock' ? 'Mock Simulation Mode' : 'AutoSocial Workstation'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Staging Folder:</span>
                <span className="font-mono text-slate-700">C:\NahaLabs\AutoSocial</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Heartbeat:</span>
                <span className="text-emerald-700 font-semibold">Healthy (12ms)</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('publishing')}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors text-center cursor-pointer"
            >
              Open Live Worker Telemetry Stream
            </button>
          </div>

          {/* Quick Platform Coverage Card */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Configured Accounts ({accounts.length})
            </h3>
            <div className="space-y-2.5">
              {accounts.slice(0, 4).map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold capitalize text-slate-700 text-[11px]">{acc.platform}</span>
                    <span className="font-mono text-slate-500 truncate">{acc.handle}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {acc.connectionStatus}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onNavigate('accounts')}
              className="mt-3 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Accounts & CLI Keys</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
