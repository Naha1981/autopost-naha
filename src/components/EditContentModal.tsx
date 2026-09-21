import React, { useState } from 'react';
import { X, Instagram, PlaySquare, Calendar, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ContentItem, Platform } from '../types';

interface EditContentModalProps {
  item: ContentItem;
  onClose: () => void;
}

export const EditContentModal: React.FC<EditContentModalProps> = ({ item, onClose }) => {
  const { brands, updateContent } = useApp();

  const [title, setTitle] = useState(item.title);
  const [caption, setCaption] = useState(item.caption);
  const [brandId, setBrandId] = useState(item.brandId);
  const [platforms, setPlatforms] = useState<Platform[]>(item.platforms);
  const [scheduledAt, setScheduledAt] = useState(
    item.scheduledAt ? new Date(item.scheduledAt).toISOString().slice(0, 16) : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePlatform = (p: Platform) => {
    if (platforms.includes(p)) {
      if (platforms.length === 1) return;
      setPlatforms(platforms.filter((x) => x !== p));
    } else {
      setPlatforms([...platforms, p]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateContent(item.id, {
        title: title.trim(),
        caption: caption.trim(),
        brandId,
        platforms,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
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
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Edit Social Content</h2>
            <p className="text-xs text-slate-500">Update title, caption, scheduling, or channel targets</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Client / Brand
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
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Caption
            </label>
            <textarea
              rows={4}
              required
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Platforms
            </label>
            <div className="flex gap-2">
              {(['instagram', 'tiktok', 'youtube'] as Platform[]).map((p) => {
                const isSelected = platforms.includes(p);
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 capitalize cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {p}
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Scheduled Date (Leave empty for Draft / Immediate)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
            />
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
