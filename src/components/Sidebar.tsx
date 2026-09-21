import React from 'react';
import {
  LayoutDashboard,
  Film,
  CalendarDays,
  Share2,
  Building2,
  FileSpreadsheet,
  Activity,
  Settings,
  ShieldCheck,
  Laptop,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export type NavTab =
  | 'dashboard'
  | 'content'
  | 'calendar'
  | 'accounts'
  | 'brands'
  | 'import'
  | 'publishing'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { contentList, jobs, accounts, publisherMode } = useApp();

  const queuedOrPublishingCount = jobs.filter(
    (j) => j.status === 'QUEUED' || j.status === 'RETRY_PENDING' || j.status === 'PUBLISHING' || j.status === 'STAGED'
  ).length;

  const failedCount = jobs.filter((j) => j.status === 'FAILED' || j.status === 'FAILED_PERMANENT').length;

  const NAV_ITEMS: Array<{
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    badgeColor?: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'content',
      label: 'Content',
      icon: <Film className="w-4 h-4" />,
      badge: contentList.length,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: <CalendarDays className="w-4 h-4" />,
    },
    {
      id: 'accounts',
      label: 'Accounts',
      icon: <Share2 className="w-4 h-4" />,
      badge: accounts.length,
    },
    {
      id: 'brands',
      label: 'Brands',
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      id: 'import',
      label: 'Import',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: 'publishing',
      label: 'Publishing',
      icon: <Activity className="w-4 h-4" />,
      badge: queuedOrPublishingCount > 0 ? queuedOrPublishingCount : failedCount > 0 ? `${failedCount} err` : undefined,
      badgeColor: queuedOrPublishingCount > 0 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-rose-500 text-white font-bold',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-64 bg-[#081220] border-r border-slate-800 text-slate-300 flex flex-col justify-between flex-shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Navigation List */}
      <div className="p-4 space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 py-2">
          Management
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500/15 to-transparent text-amber-400 border-l-2 border-amber-400 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-amber-400' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Operator Machine Worker Status Box */}
      <div className="p-4 m-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Laptop className="w-3.5 h-3.5 text-amber-400" />
            Local Worker
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ACTIVE
          </span>
        </div>

        <div className="text-[11px] text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>Runtime:</span>
            <span className="font-mono text-slate-300">{publisherMode === 'mock' ? 'Simulation' : 'AutoSocial'}</span>
          </div>
          <div className="flex justify-between">
            <span>Machine:</span>
            <span className="font-mono text-slate-300 truncate max-w-[100px]">WIN11-NAHA</span>
          </div>
          <div className="flex justify-between">
            <span>AutoSocial:</span>
            <span className="font-mono text-amber-400 truncate max-w-[100px]">queue/pending</span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center gap-1.5 text-[10px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>Zero cloud password storage</span>
        </div>
      </div>
    </aside>
  );
};
