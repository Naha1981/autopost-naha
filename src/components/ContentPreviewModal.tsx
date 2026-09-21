import React, { useState } from 'react';
import {
  X,
  Instagram,
  PlaySquare,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Music2,
  Volume2,
  VolumeX,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { ContentItem, Platform } from '../types';
import { useApp } from '../context/AppContext';

interface ContentPreviewModalProps {
  item: ContentItem | null;
  onClose: () => void;
  onPublishNow?: () => void;
}

export const ContentPreviewModal: React.FC<ContentPreviewModalProps> = ({
  item,
  onClose,
  onPublishNow,
}) => {
  if (!item) return null;

  const { brands, accounts, retryPublish } = useApp();
  const brand = brands.find((b) => b.id === item.brandId);

  // Available platforms for this item
  const initialPlatform: Platform = item.platforms[0] || 'instagram';
  const [activePlatform, setActivePlatform] = useState<Platform>(initialPlatform);
  const [isMuted, setIsMuted] = useState(true);

  // Account handle for active platform
  const account = accounts.find((a) => a.brandId === item.brandId && a.platform === activePlatform);
  const handle = account?.handle || `@${brand?.name.toLowerCase().replace(/\s+/g, '') || 'nahalabs'}`;

  const platformStatus = item.platformStatus[activePlatform];
  const postUrl = item.platformPostUrls?.[activePlatform];
  const errorMessage = item.platformErrors?.[activePlatform];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-slate-700 bg-white/80 backdrop-blur rounded-full border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: Mobile Phone Device Mockup with Video */}
        <div className="w-full md:w-[420px] bg-slate-900 flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-slate-800">
          {/* Phone Frame */}
          <div className="relative w-[300px] h-[540px] bg-black rounded-[36px] p-3 shadow-2xl border-4 border-slate-700 overflow-hidden flex flex-col">
            {/* Dynamic Island / Speaker Notch */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-800"></div>
            </div>

            {/* Video Container */}
            <div className="relative w-full h-full rounded-[28px] overflow-hidden bg-slate-950 flex items-center justify-center">
              <video
                src={item.videoUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Mute toggle button */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="absolute top-8 right-3 z-20 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur text-xs"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Instagram Reels Overlay */}
              {activePlatform === 'instagram' && (
                <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none">
                  {/* Top Header */}
                  <div className="pt-6 flex items-center justify-between text-white text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Instagram className="w-4 h-4" /> Reels
                    </span>
                  </div>

                  {/* Bottom & Right Sidebar */}
                  <div className="flex items-end justify-between">
                    <div className="max-w-[210px] text-white">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow"
                          style={{ backgroundColor: brand?.color || '#E65100' }}
                        >
                          {brand?.code?.slice(0, 2) || 'NL'}
                        </div>
                        <span className="font-semibold text-xs tracking-tight">{handle}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-medium">Follow</span>
                      </div>
                      <p className="text-xs line-clamp-3 leading-relaxed drop-shadow">{item.caption}</p>
                      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-200">
                        <Music2 className="w-3 h-3 animate-pulse" />
                        <span className="truncate">Original Audio - {brand?.name}</span>
                      </div>
                    </div>

                    {/* Reels Actions */}
                    <div className="flex flex-col items-center gap-3 text-white">
                      <div className="flex flex-col items-center">
                        <Heart className="w-6 h-6" />
                        <span className="text-[10px] font-medium">2.4k</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <MessageCircle className="w-6 h-6" />
                        <span className="text-[10px] font-medium">184</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Share2 className="w-6 h-6" />
                        <span className="text-[10px] font-medium">92</span>
                      </div>
                      <Bookmark className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              )}

              {/* TikTok Overlay */}
              {activePlatform === 'tiktok' && (
                <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 bg-gradient-to-b from-black/20 via-transparent to-black/85 pointer-events-none">
                  <div className="pt-6 flex justify-center text-white text-xs font-semibold">
                    <span className="px-2 py-0.5 rounded bg-black/40 backdrop-blur">TikTok Short</span>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="max-w-[210px] text-white">
                      <div className="font-bold text-xs mb-1 drop-shadow">{handle}</div>
                      <p className="text-xs line-clamp-3 leading-relaxed drop-shadow">{item.caption}</p>
                      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-white/90">
                        <Music2 className="w-3 h-3" />
                        <span className="truncate">Naha Sound Lab - Afro Rhythm #04</span>
                      </div>
                    </div>

                    {/* TikTok Action Stack */}
                    <div className="flex flex-col items-center gap-3.5 text-white">
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-orange-600 flex items-center justify-center font-bold text-xs">
                        {brand?.code?.slice(0, 1) || 'N'}
                      </div>
                      <div className="flex flex-col items-center">
                        <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                        <span className="text-[10px] font-bold">14.8k</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <MessageCircle className="w-6 h-6" />
                        <span className="text-[10px] font-bold">428</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Bookmark className="w-6 h-6 text-amber-400 fill-amber-400" />
                        <span className="text-[10px] font-bold">912</span>
                      </div>
                      <Share2 className="w-6 h-6" />
                      {/* Spinning record */}
                      <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 animate-spin"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* YouTube Shorts Overlay */}
              {activePlatform === 'youtube' && (
                <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none">
                  <div className="pt-6 flex items-center justify-between text-white text-xs font-semibold">
                    <span className="flex items-center gap-1">
                      <PlaySquare className="w-4 h-4 text-red-500" /> Shorts
                    </span>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="max-w-[210px] text-white">
                      <p className="text-xs font-bold leading-snug drop-shadow mb-2">{item.title}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-bold">
                          {brand?.code?.slice(0, 2) || 'NL'}
                        </div>
                        <span className="font-semibold text-xs">{handle}</span>
                        <button className="text-[10px] px-2 py-0.5 rounded-full bg-white text-black font-bold">Subscribe</button>
                      </div>
                      <p className="text-[11px] text-slate-200 line-clamp-2">{item.caption}</p>
                    </div>

                    <div className="flex flex-col items-center gap-3 text-white">
                      <div className="flex flex-col items-center">
                        <Heart className="w-6 h-6" />
                        <span className="text-[10px]">Like</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <MessageCircle className="w-6 h-6" />
                        <span className="text-[10px]">118</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Share2 className="w-6 h-6" />
                        <span className="text-[10px]">Share</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Content Details & Multi-Platform Status */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-y-auto max-h-[92vh]">
          <div>
            {/* Header info */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: brand?.color || '#0B192C' }}
              >
                {brand?.name || 'Brand'}
              </span>
              <span className="text-xs text-slate-500">ID: {item.id}</span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-2">{item.title}</h2>

            {/* Platform Preview Selector Tabs */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Preview Platform Simulation
              </label>
              <div className="flex gap-2">
                {(['instagram', 'tiktok', 'youtube'] as Platform[]).map((plat) => {
                  const isTarget = item.platforms.includes(plat);
                  const isSelected = activePlatform === plat;
                  return (
                    <button
                      key={plat}
                      onClick={() => setActivePlatform(plat)}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : isTarget
                          ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          : 'bg-slate-50/50 text-slate-400 border-slate-100 hover:bg-slate-100'
                      }`}
                    >
                      {plat === 'instagram' && <Instagram className="w-3.5 h-3.5" />}
                      {plat === 'tiktok' && <span className="font-mono text-xs">TT</span>}
                      {plat === 'youtube' && <PlaySquare className="w-3.5 h-3.5" />}
                      <span className="capitalize">{plat}</span>
                      {isTarget && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-0.5"></span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Platform Publishing Status Box */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  Target Channel: <span className="font-bold text-slate-900 capitalize">{activePlatform}</span>
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    platformStatus === 'PUBLISHED'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : platformStatus === 'FAILED'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : platformStatus === 'PUBLISHING'
                      ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                      : 'bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  {platformStatus}
                </span>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div>Account: <span className="font-mono font-medium text-slate-800">{handle}</span></div>
                {item.scheduledAt && (
                  <div>Scheduled: <span className="font-medium text-slate-800">{new Date(item.scheduledAt).toLocaleString()}</span></div>
                )}
                {postUrl && (
                  <div className="pt-2">
                    <a
                      href={postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 hover:underline"
                    >
                      Open Live Post <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {errorMessage && (
                  <div className="pt-2 text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    {errorMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Caption display */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Post Caption & Hashtags
              </label>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                {item.caption}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Close
            </button>

            <div className="flex items-center gap-2">
              {platformStatus === 'FAILED' && (
                <button
                  onClick={() => retryPublish(item.id, activePlatform)}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retry {activePlatform}
                </button>
              )}

              {item.status !== 'PUBLISHED' && (
                <button
                  onClick={() => {
                    if (onPublishNow) onPublishNow();
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#1E3E62] text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
                >
                  Publish Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
