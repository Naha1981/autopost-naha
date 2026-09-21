import React from 'react';
import { Instagram, PlaySquare, Video, CheckCircle2, AlertCircle, Clock, Loader2, ArrowUpRight } from 'lucide-react';
import { Platform, PlatformPublishStatus } from '../types';

interface PlatformBadgeProps {
  platform: Platform;
  status: PlatformPublishStatus;
  postUrl?: string;
  errorMessage?: string;
  showIconOnly?: boolean;
  onRetry?: () => void;
}

export const PlatformBadge: React.FC<PlatformBadgeProps> = ({
  platform,
  status,
  postUrl,
  errorMessage,
  showIconOnly = false,
  onRetry,
}) => {
  const getPlatformIcon = () => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="w-3.5 h-3.5" />;
      case 'tiktok':
        return (
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.27 6.27 0 0 0 1.87-4.49V8.62a8.28 8.28 0 0 0 4.88 1.58V6.75a4.86 4.86 0 0 1-.98-.06z" />
          </svg>
        );
      case 'youtube':
        return <PlaySquare className="w-3.5 h-3.5" />;
    }
  };

  const getPlatformName = () => {
    switch (platform) {
      case 'instagram':
        return 'Instagram';
      case 'tiktok':
        return 'TikTok';
      case 'youtube':
        return 'YouTube';
    }
  };

  const getStatusStyles = () => {
    switch (status) {
      case 'PUBLISHED':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
          label: 'Published',
        };
      case 'FAILED':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <AlertCircle className="w-3 h-3 text-rose-600" />,
          label: 'Failed',
        };
      case 'PUBLISHING':
      case 'STAGED':
      case 'CLAIMED':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />,
          label: status === 'STAGED' ? 'Staged' : 'Publishing',
        };
      case 'QUEUED':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <Clock className="w-3 h-3 text-blue-600" />,
          label: 'Queued',
        };
      case 'IDLE':
      default:
        return {
          bg: 'bg-slate-50 text-slate-600 border-slate-200',
          icon: null,
          label: 'Pending',
        };
    }
  };

  const statusStyle = getStatusStyles();

  if (showIconOnly) {
    return (
      <span
        title={`${getPlatformName()}: ${statusStyle.label}`}
        className={`inline-flex items-center justify-center w-6 h-6 rounded-md border text-xs font-medium ${statusStyle.bg}`}
      >
        {getPlatformIcon()}
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${statusStyle.bg}`}
    >
      <span className="opacity-90">{getPlatformIcon()}</span>
      <span className="font-semibold">{getPlatformName()}</span>
      <span className="opacity-40">|</span>
      <span className="flex items-center gap-1">
        {statusStyle.icon}
        <span>{statusStyle.label}</span>
      </span>

      {postUrl && (
        <a
          href={postUrl}
          target="_blank"
          rel="noreferrer"
          title="View published post"
          className="ml-1 hover:text-emerald-950 inline-flex items-center"
        >
          <ArrowUpRight className="w-3 h-3" />
        </a>
      )}

      {status === 'FAILED' && onRetry && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
          className="ml-1 text-[11px] font-bold text-rose-800 hover:text-rose-950 underline cursor-pointer"
        >
          Retry
        </button>
      )}
    </div>
  );
};
