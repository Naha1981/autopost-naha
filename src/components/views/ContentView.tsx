import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Play,
  Calendar,
  Trash2,
  Edit3,
  Send,
  Eye,
  RotateCcw,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Platform, ContentItem } from '../../types';
import { PlatformBadge } from '../PlatformBadge';
import { EditContentModal } from '../EditContentModal';

interface ContentViewProps {
  onOpenCreate: () => void;
}

export const ContentView: React.FC<ContentViewProps> = ({ onOpenCreate }) => {
  const {
    contentList,
    brands,
    selectedBrandId,
    deleteContent,
    publishNow,
    retryPublish,
    setSelectedContentItem,
    scheduleContent,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [schedulingItemId, setSchedulingItemId] = useState<string | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  // Filtering
  const filtered = contentList.filter((item) => {
    if (selectedBrandId !== 'ALL' && item.brandId !== selectedBrandId) return false;
    if (platformFilter !== 'ALL' && !item.platforms.includes(platformFilter as Platform)) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchCaption = item.caption.toLowerCase().includes(q);
      if (!matchTitle && !matchCaption) return false;
    }
    return true;
  });

  const handleSaveSchedule = async (contentId: string) => {
    if (!scheduleDateTime) return;
    await scheduleContent(contentId, new Date(scheduleDateTime).toISOString());
    setSchedulingItemId(null);
    setScheduleDateTime('');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Content Repository</h1>
          <p className="text-xs text-slate-500">
            Manage multi-platform video assets, staging pipelines, and schedule dispatches
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#1E3E62] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Content</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, caption or hashtags..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-800"
          />
        </div>

        {/* Platform Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Platform:</span>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
          >
            <option value="ALL">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="QUEUED">Queued</option>
            <option value="PUBLISHING">Publishing</option>
            <option value="PUBLISHED">Published</option>
            <option value="FAILED">Failed</option>
            <option value="PARTIAL">Partial</option>
          </select>
        </div>
      </div>

      {/* Content Rendering: Table or Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-sm font-bold text-slate-700">No content items match your current filter.</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting search filters or upload new creative.</p>
          <button
            onClick={onOpenCreate}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
          >
            Create New Item
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-5">Video Asset</th>
                <th className="p-3.5">Brand</th>
                <th className="p-3.5">Caption & Content</th>
                <th className="p-3.5">Platform Statuses</th>
                <th className="p-3.5">Scheduled Time</th>
                <th className="p-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filtered.map((item) => {
                const brand = brands.find((b) => b.id === item.brandId);
                const hasFailure = item.platforms.some((p) => item.platformStatus[p] === 'FAILED');

                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Video Asset Column */}
                    <td className="p-3.5 pl-5 align-top">
                      <div
                        onClick={() => setSelectedContentItem(item)}
                        className="relative w-14 h-20 rounded-lg bg-slate-900 overflow-hidden cursor-pointer group border border-slate-200 shadow-xs flex-shrink-0"
                      >
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <video src={item.videoUrl} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      </div>
                    </td>

                    {/* Brand Column */}
                    <td className="p-3.5 align-top">
                      <span
                        className="inline-block px-2.5 py-1 rounded-md text-white text-[10px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: brand?.color || '#0B192C' }}
                      >
                        {brand?.name}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">{brand?.code}</div>
                    </td>

                    {/* Caption & Content Column */}
                    <td className="p-3.5 align-top max-w-xs">
                      <div className="font-bold text-slate-900 text-xs mb-1 truncate">{item.title}</div>
                      <p className="text-slate-500 line-clamp-2 leading-relaxed text-[11px]">{item.caption}</p>
                    </td>

                    {/* Independent Platform Statuses */}
                    <td className="p-3.5 align-top">
                      <div className="flex flex-col gap-1.5">
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
                    </td>

                    {/* Scheduled Time */}
                    <td className="p-3.5 align-top">
                      {item.scheduledAt ? (
                        <div>
                          <div className="font-semibold text-slate-800">
                            {new Date(item.scheduledAt).toLocaleDateString()}
                          </div>
                          <div className="text-slate-400 text-[10px] font-mono">
                            {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not scheduled</span>
                      )}
                    </td>

                    {/* Actions: Preview, Edit, Schedule, Post now, Delete */}
                    <td className="p-3.5 pr-5 align-top text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Preview */}
                        <button
                          onClick={() => setSelectedContentItem(item)}
                          title="Interactive Device Preview"
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => setEditingItem(item)}
                          title="Edit Content"
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Schedule Modal trigger */}
                        <button
                          onClick={() => {
                            setSchedulingItemId(item.id);
                            setScheduleDateTime(
                              item.scheduledAt ? new Date(item.scheduledAt).toISOString().slice(0, 16) : ''
                            );
                          }}
                          title="Schedule"
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>

                        {/* Post Now / Retry */}
                        {hasFailure ? (
                          <button
                            onClick={() => retryPublish(item.id)}
                            title="Retry Failed Platforms"
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        ) : item.status !== 'PUBLISHED' ? (
                          <button
                            onClick={() => publishNow(item.id)}
                            title="Post Now to Queue"
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Post</span>
                          </button>
                        ) : null}

                        {/* Delete */}
                        <button
                          onClick={() => deleteContent(item.id)}
                          title="Delete Content"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid Mode */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => {
            const brand = brands.find((b) => b.id === item.brandId);
            const hasFailure = item.platforms.some((p) => item.platformStatus[p] === 'FAILED');

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div
                    onClick={() => setSelectedContentItem(item)}
                    className="relative w-full h-48 bg-slate-900 cursor-pointer group overflow-hidden"
                  >
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <video src={item.videoUrl} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                    <span
                      className="absolute top-3 left-3 px-2.5 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider"
                      style={{ backgroundColor: brand?.color || '#0B192C' }}
                    >
                      {brand?.name}
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{item.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{item.caption}</p>

                    <div className="space-y-1 pt-1">
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
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">
                    {item.scheduledAt ? new Date(item.scheduledAt).toLocaleDateString() : 'Draft'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {hasFailure ? (
                      <button
                        onClick={() => retryPublish(item.id)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-600 text-white"
                      >
                        Retry
                      </button>
                    ) : item.status !== 'PUBLISHED' ? (
                      <button
                        onClick={() => publishNow(item.id)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-900 text-white"
                      >
                        Post
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <EditContentModal item={editingItem} onClose={() => setEditingItem(null)} />
      )}

      {/* Quick Reschedule Inline Dialog */}
      {schedulingItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Schedule Publishing</h3>
            <p className="text-xs text-slate-500 mb-4">Choose date & time to dispatch to AutoSocial queue</p>
            <input
              type="datetime-local"
              value={scheduleDateTime}
              onChange={(e) => setScheduleDateTime(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSchedulingItemId(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveSchedule(schedulingItemId)}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
