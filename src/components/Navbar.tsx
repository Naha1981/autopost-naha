import React from 'react';
import {
  Building2,
  Plus,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  User,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface NavbarProps {
  onOpenCreateModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCreateModal }) => {
  const {
    user,
    signOut,
    loginAsDemoOperator,
    brands,
    selectedBrandId,
    setSelectedBrandId,
    publisherMode,
    setPublisherMode,
    isFailureSimulated,
  } = useApp();

  const activeBrand = brands.find((b) => b.id === selectedBrandId);

  return (
    <header className="h-16 bg-[#0B192C] text-white border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
      {/* Brand & Workspace Identity */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E65100] to-[#F5A623] flex items-center justify-center font-black text-white text-base shadow-sm tracking-tighter">
            NL
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-white flex items-center gap-2">
              <span>NahaLabs</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
                Command Center
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">Social Publishing System</div>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>

        {/* Brand Selector Dropdown */}
        <div className="relative hidden md:flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            <option value="ALL">All Client Brands ({brands.length})</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Action Tools & Profile */}
      <div className="flex items-center gap-3">
        {/* Worker Mode Switcher Pill */}
        <div className="hidden lg:flex items-center bg-slate-900/80 border border-slate-700 rounded-xl p-1 text-xs">
          <button
            onClick={() => setPublisherMode('mock')}
            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              publisherMode === 'mock'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Mock Worker</span>
          </button>
          <button
            onClick={() => setPublisherMode('autosocial')}
            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              publisherMode === 'autosocial'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>AutoSocial Daemon</span>
          </button>
        </div>

        {/* Primary Action: New Post */}
        <button
          onClick={onOpenCreateModal}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#E65100] to-[#F5A623] hover:from-[#BF360C] hover:to-[#E65100] text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Dispatch Post</span>
        </button>

        {/* User Profile Pill */}
        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-slate-300" />
              )}
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-xs font-bold leading-none text-slate-200 truncate max-w-[120px]">
                {user.displayName}
              </div>
              <div className="text-[10px] text-amber-400 font-mono">Lead Operator</div>
            </div>
            <button
              onClick={signOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={loginAsDemoOperator}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700 cursor-pointer"
          >
            Operator Sign In
          </button>
        )}
      </div>
    </header>
  );
};
