import React, { useState } from 'react';
import {
  Share2,
  Plus,
  ShieldCheck,
  Terminal,
  Instagram,
  PlaySquare,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Laptop,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { publisherService } from '../../services/publisher/PublisherService';
import { SocialAccount } from '../../types';

interface AccountsViewProps {
  onOpenAddAccount: () => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({ onOpenAddAccount }) => {
  const { accounts, brands, selectedBrandId } = useApp();
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredAccounts =
    selectedBrandId === 'ALL'
      ? accounts
      : accounts.filter((a) => a.brandId === selectedBrandId);

  const handleVerify = async (acc: SocialAccount) => {
    setVerifyingId(acc.id);
    try {
      const res = await publisherService.verifyAccount(acc);
      setVerificationFeedback((prev) => ({
        ...prev,
        [acc.id]: res.message,
      }));
    } finally {
      setVerifyingId(null);
    }
  };

  const copyCli = (command: string, id: string) => {
    navigator.clipboard.writeText(command);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Social Accounts & Sessions</h1>
          <p className="text-xs text-slate-500">
            Manage target channel profiles mapped to your local AutoSocial queue directories
          </p>
        </div>

        <button
          onClick={onOpenAddAccount}
          className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#1E3E62] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register Social Account</span>
        </button>
      </div>

      {/* Mandatory Architecture Notice Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 shadow-xs flex items-start gap-4 text-xs text-amber-950">
        <div className="w-10 h-10 rounded-xl bg-amber-200/60 flex items-center justify-center flex-shrink-0 text-amber-800">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-amber-900 text-sm">
            Zero-Trust Credential Isolation Architecture
          </h4>
          <p className="leading-relaxed">
            <strong>Connect this account using the NahaLabs Local Publisher.</strong> The web app does not perform the actual Instagram, TikTok, or YouTube login, nor does it store passwords or cookies in the cloud. The local worker handles browser login through Playwright and maintains persistent Chromium profiles in{' '}
            <code className="bg-amber-200/60 px-1.5 py-0.5 rounded font-mono text-[11px]">.profiles/&lt;account&gt;/&lt;platform&gt;</code> on the operator&apos;s Windows laptop.
          </p>
        </div>
      </div>

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAccounts.map((acc) => {
          const brand = brands.find((b) => b.id === acc.brandId);
          const cleanHandle = acc.handle.replace('@', '');
          const cliLoginCmd = `node worker.mjs login --account ${cleanHandle} --platform ${acc.platform}`;
          const isVerifying = verifyingId === acc.id;
          const feedback = verificationFeedback[acc.id];

          return (
            <div
              key={acc.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                {/* Brand & Platform Header */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="px-2.5 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider"
                    style={{ backgroundColor: brand?.color || '#0B192C' }}
                  >
                    {brand?.name}
                  </span>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      acc.connectionStatus === 'CONNECTED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {acc.connectionStatus === 'CONNECTED' ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                    )}
                    <span>{acc.connectionStatus}</span>
                  </span>
                </div>

                {/* Account Handle & Identity */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
                    {acc.platform === 'instagram' && <Instagram className="w-5 h-5" />}
                    {acc.platform === 'tiktok' && <span className="font-bold text-xs">TT</span>}
                    {acc.platform === 'youtube' && <PlaySquare className="w-5 h-5" />}
                  </div>
                  <div className="truncate">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{acc.handle}</h3>
                    <div className="text-xs text-slate-500 truncate">{acc.accountName}</div>
                  </div>
                </div>

                {/* Directory Mapping Details */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5 mb-4">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    AutoSocial Local Mapping
                  </div>
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-slate-500">Queue:</span>
                    <span className="text-slate-800 truncate max-w-[170px]">
                      {acc.autoSocialQueuePath || `queue/${cleanHandle}/${acc.platform}`}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-slate-500">Profile:</span>
                    <span className="text-slate-800 truncate max-w-[170px]">
                      .profiles/{cleanHandle}/{acc.platform}
                    </span>
                  </div>
                  {acc.lastActivityAt && (
                    <div className="flex justify-between text-[11px] pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500">Last Synced:</span>
                      <span className="text-slate-700 font-medium">
                        {new Date(acc.lastActivityAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Verification Feedback Banner if tested */}
                {feedback && (
                  <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-700 mb-3">
                    {feedback}
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleVerify(acc)}
                  disabled={isVerifying}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                  <span>Verify Session</span>
                </button>

                <button
                  onClick={() => copyCli(cliLoginCmd, acc.id)}
                  title="Copy Operator Windows CLI Command"
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer flex items-center gap-1 text-[11px]"
                >
                  {copiedId === acc.id ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Copied CLI
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy className="w-3.5 h-3.5" /> CLI
                    </span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
