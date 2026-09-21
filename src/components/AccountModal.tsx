import React, { useState } from 'react';
import { X, ShieldAlert, Terminal, Copy, Check, Instagram, PlaySquare } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Platform } from '../types';

interface AccountModalProps {
  onClose: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ onClose }) => {
  const { brands, addSocialAccount } = useApp();
  const [brandId, setBrandId] = useState(brands[0]?.id || '');
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [handle, setHandle] = useState('@');
  const [accountName, setAccountName] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cleanHandle = handle.trim().replace(/^@+/, '');
  const cliCommand = `node worker.mjs login --account ${cleanHandle || 'account_name'} --platform ${platform}`;

  const copyCli = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim() || !brandId) return;

    setIsSubmitting(true);
    try {
      const formattedHandle = handle.startsWith('@') ? handle.trim() : `@${handle.trim()}`;
      await addSocialAccount({
        brandId,
        platform,
        handle: formattedHandle,
        accountName: accountName.trim() || formattedHandle,
        connectionStatus: 'CONNECTED',
        localWorkerId: 'worker-win11-operator',
        autoSocialQueuePath: `queue/${formattedHandle.replace('@', '')}/${platform}`,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Register Social Account</h2>
            <p className="text-xs text-slate-500">Configure target channel for AutoSocial queue worker</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security / Architecture Notice */}
        <div className="p-4 bg-amber-50/70 border-b border-amber-200/80 flex items-start gap-3 text-xs text-amber-950 leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Important Architecture Rule:</span> The web app does NOT perform social logins.
            <div className="text-amber-800 mt-0.5">
              Connect this account using the <strong>NahaLabs Local Publisher</strong>. The local worker handles browser login through AutoSocial and stores session cookies securely on your Windows machine.
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Client / Brand <span className="text-rose-500">*</span>
            </label>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Platform Target <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'instagram', label: 'Instagram', icon: <Instagram className="w-3.5 h-3.5" /> },
                  { id: 'tiktok', label: 'TikTok', icon: <span className="font-bold text-[10px]">TT</span> },
                  { id: 'youtube', label: 'YouTube', icon: <PlaySquare className="w-3.5 h-3.5" /> },
                ] as const
              ).map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    platform === p.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p.icon}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Social Account Handle / Username <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@nahastudios.za"
              className="w-full px-3.5 py-2 text-xs font-mono font-medium rounded-xl border border-slate-200 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Display Name / Label
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Naha Studios Official Reel"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 text-slate-900"
            />
          </div>

          {/* Local Operator CLI Command Helper */}
          <div className="p-3 bg-slate-900 rounded-xl text-white">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                Operator Windows Login Command
              </span>
              <button
                type="button"
                onClick={copyCli}
                className="hover:text-white flex items-center gap-1 text-[10px] cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <code className="text-xs text-amber-300 font-mono block break-all">
              {cliCommand}
            </code>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
            >
              {isSubmitting ? 'Registering...' : 'Register Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
