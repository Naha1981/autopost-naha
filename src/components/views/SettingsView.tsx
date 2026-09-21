import React from 'react';
import {
  ShieldCheck,
  FolderTree,
  Check,
  Laptop,
  Cloud,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SettingsView: React.FC = () => {
  const { user, publisherMode } = useApp();

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">System & Worker Settings</h1>
        <p className="text-xs text-slate-500">
          Cloud control-plane settings and local AutoSocial worker architecture
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Cloud Control Plane</h3>
            <p className="text-xs text-slate-500">
              Firestore is the source of truth for content, publishing jobs, events and account mappings.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 text-xs text-slate-700">
          <div className="py-2.5 flex items-center justify-between">
            <span>Worker secret exposed to browser:</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> NO</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span>Publishing jobs stored durably:</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> FIRESTORE</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span>Uploaded videos stored durably:</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> FIREBASE STORAGE</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Local AutoSocial Worker</h3>
            <p className="text-xs text-slate-500">
              The worker is configured on the Windows operator machine. Its secret and browser profiles never enter this web app.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 space-y-1.5">
          <div>AutoSocial root: configured locally on worker</div>
          <div>Expected example: C:Users&lt;operator&gt;AutoSocial</div>
          <div>Browser profiles: .profiles&lt;account&gt;&lt;platform&gt;</div>
          <div>Dashboard: 127.0.0.1:3000</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Credential Isolation</h3>
            <p className="text-xs text-slate-500">
              Social login credentials and Playwright sessions remain on the operator machine.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 text-xs text-slate-700">
          <div className="py-2.5 flex items-center justify-between"><span>Passwords / cookies in Firestore:</span><span className="font-bold text-emerald-600"><Check className="w-3.5 h-3.5 inline" /> NONE</span></div>
          <div className="py-2.5 flex items-center justify-between"><span>Playwright profiles in cloud:</span><span className="font-bold text-emerald-600"><Check className="w-3.5 h-3.5 inline" /> NONE</span></div>
          <div className="py-2.5 flex items-center justify-between"><span>AutoSocial dashboard remotely exposed:</span><span className="font-bold text-emerald-600"><Check className="w-3.5 h-3.5 inline" /> NO</span></div>
          <div className="py-2.5 flex items-center justify-between"><span>Current publisher mode:</span><span className="font-bold text-slate-900">{publisherMode === 'mock' ? 'MOCK TEST' : 'CLOUD QUEUE / LOCAL AUTOSOCIAL'}</span></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">TN</div>
          <div>
            <div className="text-sm font-bold text-slate-900">{user?.displayName || 'Operator'}</div>
            <div className="text-xs text-slate-500">{user?.email || 'Not signed in'}</div>
          </div>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
          <Laptop className="w-3.5 h-3.5" /> Lead Operator
        </span>
      </div>
    </div>
  );
};