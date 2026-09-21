import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Film,
  Instagram,
  PlaySquare,
  Calendar,
  Clock,
  Sparkles,
  Check,
  AlertCircle,
  Play,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SAMPLE_VIDEOS } from '../data/initialData';
import { mediaStorageService } from '../services/media/MediaStorageService';
import { Platform } from '../types';

interface CreateContentModalProps {
  onClose: () => void;
}

export const CreateContentModal: React.FC<CreateContentModalProps> = ({ onClose }) => {
  const { brands, createContent } = useApp();

  const [brandId, setBrandId] = useState(brands[0]?.id || '');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [videoUrl, setVideoUrl] = useState(SAMPLE_VIDEOS[0].url);
  const [videoStorageKey, setVideoStorageKey] = useState('');
  const [videoFileName, setVideoFileName] = useState(SAMPLE_VIDEOS[0].title);
  const [platforms, setPlatforms] = useState<Platform[]>(['instagram', 'tiktok', 'youtube']);
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePlatform = (p: Platform) => {
    if (platforms.includes(p)) {
      if (platforms.length === 1) return; // Must have at least 1
      setPlatforms(platforms.filter((x) => x !== p));
    } else {
      setPlatforms([...platforms, p]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setUploadError('Please select a valid video file (.mp4, .mov, .webm).');
      return;
    }
    setUploadError(null);
    setIsUploading(true);

    try {
      const result = await mediaStorageService.upload(file);
      setVideoUrl(result.url);
      setVideoStorageKey(result.storageKey);
      setVideoFileName(result.fileName);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    } catch (err: any) {
      setUploadError(err.message || 'Video upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !videoUrl || platforms.length === 0) return;

    setIsSubmitting(true);
    try {
      const postNow = scheduleMode === 'now';
      await createContent(
        {
          brandId,
          title: title.trim(),
          caption: caption.trim(),
          videoUrl,
          mediaStorageKey: videoStorageKey || undefined,
          platforms,
          scheduledAt: scheduleMode === 'schedule' && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        },
        postNow
      );
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">New Social Content Dispatch</h2>
            <p className="text-xs text-slate-500">Stage media and captions for multi-channel publishing via AutoSocial</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Brand Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Client / Brand <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {brands.map((b) => {
                const isSelected = brandId === b.id;
                return (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => setBrandId(b.id)}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm ring-1 ring-slate-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: b.color }}
                    />
                    <div className="truncate">
                      <div className="text-xs font-bold truncate">{b.name}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        {b.code}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Post Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Behind the Scenes - Episode 05"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900"
            />
          </div>

          {/* Video Asset Source */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Video Media Asset (9:16 Short-Form) <span className="text-rose-500">*</span>
            </label>

            {/* Drag and drop upload zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-slate-300 hover:border-slate-500 rounded-xl p-5 text-center bg-slate-50/60 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-700 mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  {isUploading ? 'Encoding & Processing Video...' : 'Click or Drag & Drop Video File'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">MP4, MOV, or WebM (up to 250MB)</div>
              </div>
            </div>

            {/* Quick Sample Video Pickers */}
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Or use sample creative:</span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_VIDEOS.map((vid, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setVideoUrl(vid.url);
                      setVideoStorageKey('');
                      setVideoFileName(vid.title);
                      if (!title) setTitle(vid.title);
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      videoUrl === vid.url
                        ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {vid.title.slice(0, 24)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Selected File Badge */}
            {videoUrl && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                <span className="flex items-center gap-1.5 font-medium truncate">
                  <Film className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
                  <span className="truncate">Active Asset: {videoFileName}</span>
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                  READY
                </span>
              </div>
            )}

            {uploadError && (
              <div className="mt-2 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {uploadError}
              </div>
            )}
          </div>

          {/* Caption */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Post Caption & Hashtags <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">{caption.length} / 2,200</span>
            </div>
            <textarea
              required
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write caption, mention relevant creators, and include hashtags (#NahaStudios #Joburg #Creative)..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 resize-none leading-relaxed"
            />
          </div>

          {/* Target Platforms */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Publishing Targets (Select Channels) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { id: 'instagram', name: 'Instagram Reels', icon: <Instagram className="w-4 h-4" /> },
                  {
                    id: 'tiktok',
                    name: 'TikTok',
                    icon: (
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.27 6.27 0 0 0 1.87-4.49V8.62a8.28 8.28 0 0 0 4.88 1.58V6.75a4.86 4.86 0 0 1-.98-.06z" />
                      </svg>
                    ),
                  },
                  { id: 'youtube', name: 'YouTube Shorts', icon: <PlaySquare className="w-4 h-4" /> },
                ] as const
              ).map((plat) => {
                const isSelected = platforms.includes(plat.id);
                return (
                  <button
                    type="button"
                    key={plat.id}
                    onClick={() => togglePlatform(plat.id)}
                    className={`py-3 px-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0B192C] bg-[#0B192C] text-white shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {plat.icon}
                      <span>{plat.name}</span>
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Each channel will be tracked with an independent publishing job in AutoSocial.
            </p>
          </div>

          {/* Schedule / Dispatch Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Dispatch Action
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScheduleMode('now')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  scheduleMode === 'now'
                    ? 'border-amber-600 bg-amber-50/80 text-amber-950 font-bold ring-1 ring-amber-600'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Post Now (Immediate Queue)</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Pushes job immediately to local AutoSocial worker
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScheduleMode('schedule')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  scheduleMode === 'schedule'
                    ? 'border-[#0B192C] bg-slate-100 text-slate-900 font-bold ring-1 ring-[#0B192C]'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Calendar className="w-4 h-4 text-slate-700" />
                  <span>Schedule for Later</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Set date and time for automatic publishing</div>
              </button>
            </div>

            {scheduleMode === 'schedule' && (
              <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Publishing Date & Time (SAST / UTC+2)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800"
                />
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !videoUrl}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
                scheduleMode === 'now'
                  ? 'bg-[#E65100] hover:bg-[#BF360C]'
                  : 'bg-[#0B192C] hover:bg-[#1E3E62]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting
                ? 'Queueing Jobs...'
                : scheduleMode === 'now'
                ? 'Post Now to Queue'
                : 'Schedule Content'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
