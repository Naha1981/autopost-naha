import React from 'react';
import { FolderTree, ShieldCheck, KeyRound, Laptop, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SettingsView: React.FC = () => {
  const { user, publisherMode, setPublisherMode } = useApp();

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">System & Worker Settings</h1>
        <p className="text-xs text-slate-500">The cloud app controls jobs. Your Windows worker owns the private AutoSocial session.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center"><KeyRound className="w-5 h-5" /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Worker Secret</h3>
            <p className="text-xs text-slate-500">The worker secret is hidden from the browser and is never stored in this UI.</p>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
          Put the same random secret in <code className="font-mono">WORKER_API_SECRET</code> on the server and <code className="font-mono">WORKER_TOKEN</code> in <code className="font-mono">worker/.env</code> on the Windows laptop. Never paste it into a browser setting or GitHub source file.
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center"><FolderTree className="w-5 h-5" /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Windows AutoSocial Path</h3>
            <p className="text-xs text-slate-500">Configured only on the private worker machine.</p>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700">C:\Users\Thabiso\AutoSocial</div>
        <div className="text-[11px] text-slate-500 leading-relaxed">Queue, Playwright profiles, cookies, and login sessions stay on this Windows machine.</div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Current Architecture Checks</h3>
            <p className="text-xs text-slate-500">Security boundaries this app now follows.</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100 text-xs text-slate-700">
          {[
            'No social-media passwords or browser cookies in Firestore',
            'No browser calls to localhost AutoSocial',
            'Worker communicates outbound over HTTPS',
            'Media files use Firebase Storage instead of browser object URLs',
            'Firestore data is scoped by organization',
          ].map((item) => (
            <div key={item} className="py-2.5 flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" /><span>{item}</span></div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4"><Laptop className="w-5 h-5 text-slate-700" /><div><h3 className="text-sm font-bold text-slate-900">Worker Runtime</h3><p className="text-xs text-slate-500">Mode currently selected for testing.</p></div></div>
        <div className="flex gap-2">
          <button onClick={() => setPublisherMode('mock')} className={publisherMode === 'mock' ? 'px-3 py-2 rounded-lg text-xs font-bold border bg-slate-900 text-white border-slate-900' : 'px-3 py-2 rounded-lg text-xs font-bold border bg-white text-slate-600 border-slate-200'}>Mock</button>
          <button onClick={() => setPublisherMode('autosocial')} className={publisherMode === 'autosocial' ? 'px-3 py-2 rounded-lg text-xs font-bold border bg-emerald-600 text-white border-emerald-600' : 'px-3 py-2 rounded-lg text-xs font-bold border bg-white text-slate-600 border-slate-200'}>Local Worker</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center justify-between">
        <div><div className="text-sm font-bold text-slate-900">Operator</div><div className="text-xs text-slate-500">{user?.displayName || 'Not signed in'} · {user?.email || '—'}</div></div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">Lead Operator</span>
      </div>
    </div>
  );
};
