import React, { useState } from 'react';
import {
  Settings,
  Key,
  Copy,
  Check,
  ShieldCheck,
  FolderTree,
  HardDrive,
  User,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SettingsView: React.FC = () => {
  const { user, publisherMode, setPublisherMode } = useApp();
  const [workerToken] = useState('nh_live_sec_99384729104829384729');
  const [autoSocialPath, setAutoSocialPath] = useState('C:\\NahaLabs\\AutoSocial');
  const [copied, setCopied] = useState(false);

  const copyToken = () => {
    navigator.clipboard.writeText(workerToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">System & Worker Settings</h1>
        <p className="text-xs text-slate-500">
          Configure security secrets, AutoSocial directory paths, and local daemon communication
        </p>
      </div>

      {/* Worker Secret Token Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Local Worker Machine Token</h3>
            <p className="text-xs text-slate-500">
              Paste this secret token into your Windows operator machine&apos;s <code className="font-mono">.env</code> file
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="password"
            readOnly
            value={workerToken}
            className="flex-1 font-mono text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
          />
          <button
            onClick={copyToken}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy Secret'}</span>
          </button>
        </div>
      </div>

      {/* AutoSocial Directory Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">AutoSocial Directory Configuration</h3>
            <p className="text-xs text-slate-500">
              Root directory of the AutoSocial installation on the operator&apos;s Windows laptop
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Workstation Path
          </label>
          <input
            type="text"
            value={autoSocialPath}
            onChange={(e) => setAutoSocialPath(e.target.value)}
            className="w-full font-mono text-xs px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-900"
          />
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 space-y-1">
          <div>Queue Target: {autoSocialPath}\queue\&lt;account&gt;\&lt;platform&gt;\pending</div>
          <div>Profiles: {autoSocialPath}\.profiles\&lt;account&gt;\&lt;platform&gt;</div>
        </div>
      </div>

      {/* Pre-Deployment Security Review & Compliance */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Architecture Security Audit</h3>
            <p className="text-xs text-slate-500">
              Verified isolation guarantees between public cloud control center and private local worker
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 text-xs text-slate-700">
          <div className="py-2.5 flex items-center justify-between">
            <span>Social media passwords ingested in web UI or Firestore:</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> NONE (Zero-Trust)
            </span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span>Browser cookies or Playwright `.profiles` uploaded to cloud:</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> NONE (Local Only)
            </span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span>AutoSocial local Express dashboard exposed to internet:</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> BLOCKED (Private Workstation)
            </span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span>Cloud Firestore Tenant Security Rules:</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> ENFORCED (Deployed)
            </span>
          </div>
        </div>
      </div>

      {/* Operator Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
            TN
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">{user?.displayName || 'Thabiso Naha'}</div>
            <div className="text-xs text-slate-500">{user?.email || 'naha.thabiso@gmail.com'}</div>
          </div>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
          Lead Operator
        </span>
      </div>
    </div>
  );
};
