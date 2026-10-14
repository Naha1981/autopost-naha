import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, LoaderCircle, WandSparkles, AlertTriangle } from 'lucide-react';
import { auth } from '../services/firebase';
import { Platform } from '../types';

interface CaptionAssistantProps {
  brandName: string;
  brandDescription?: string;
  title: string;
  platforms: Platform[];
  onGenerated: (caption: string) => void;
}

type Tone = 'professional' | 'friendly' | 'bold' | 'educational';
type Objective = 'awareness' | 'engagement' | 'leads' | 'education' | 'sales';

interface GenerateCaptionResponse {
  ok: boolean;
  caption?: string;
  engine?: 'ollama' | 'template-fallback';
  model?: string;
  platform?: Platform;
  warning?: string;
  error?: string;
}

const platformNames: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube Shorts',
};

export const CaptionAssistant: React.FC<CaptionAssistantProps> = ({
  brandName,
  brandDescription,
  title,
  platforms,
  onGenerated,
}) => {
  const availablePlatforms = useMemo(
    () => platforms.length ? platforms : (['instagram'] as Platform[]),
    [platforms]
  );
  const [platform, setPlatform] = useState<Platform>(availablePlatforms[0] || 'instagram');
  const [tone, setTone] = useState<Tone>('professional');
  const [objective, setObjective] = useState<Objective>('awareness');
  const [audience, setAudience] = useState('');
  const [callToAction, setCallToAction] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [engine, setEngine] = useState<'ollama' | 'template-fallback' | ''>('');

  useEffect(() => {
    if (!availablePlatforms.includes(platform)) setPlatform(availablePlatforms[0] || 'instagram');
  }, [availablePlatforms, platform]);

  const generate = async () => {
    if (!title.trim()) {
      setError('Add a post title or topic first.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
    setEngine('');

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/ai/generate-caption', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify({
          brandName,
          brandDescription,
          title,
          platform,
          tone,
          objective,
          audience,
          callToAction,
          hashtags,
        }),
      });
      const payload = await response.json() as GenerateCaptionResponse;
      if (!response.ok || !payload.ok || !payload.caption) {
        throw new Error(payload.error || 'Caption generation failed.');
      }
      onGenerated(payload.caption);
      setEngine(payload.engine || '');
      setNotice(payload.warning || (payload.engine === 'ollama'
        ? 'Generated with your configured local Ollama model. Review before publishing.'
        : 'Template draft inserted. No LLM was used.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Caption generation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <WandSparkles className="h-4 w-4 text-violet-700" />
            Local AI Caption Studio
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
            Draft a platform-specific caption. Nothing is published automatically.
          </p>
          {platforms.length > 1 && (
            <p className="mt-1 text-[10px] leading-relaxed text-amber-800">
              The current composer stores one shared caption for every checked platform. Review the wording before publishing across channels.
            </p>
          )}
        </div>
        <span className="rounded-full border border-violet-200 bg-white px-2 py-1 text-[10px] font-semibold text-violet-800">
          No paid AI API
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block text-[11px] font-semibold text-slate-700">
          Target platform
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value as Platform)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"
          >
            {availablePlatforms.map((item) => (
              <option key={item} value={item}>{platformNames[item]}</option>
            ))}
          </select>
        </label>
        <label className="block text-[11px] font-semibold text-slate-700">
          Tone
          <select
            value={tone}
            onChange={(event) => setTone(event.target.value as Tone)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"
          >
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="bold">Confident and direct</option>
            <option value="educational">Educational</option>
          </select>
        </label>
        <label className="block text-[11px] font-semibold text-slate-700">
          Campaign objective
          <select
            value={objective}
            onChange={(event) => setObjective(event.target.value as Objective)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"
          >
            <option value="awareness">Awareness</option>
            <option value="engagement">Engagement</option>
            <option value="leads">Generate enquiries</option>
            <option value="education">Educate audience</option>
            <option value="sales">Drive sales</option>
          </select>
        </label>
        <label className="block text-[11px] font-semibold text-slate-700">
          Audience (optional)
          <input
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            maxLength={180}
            placeholder="e.g. Johannesburg homeowners"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"
          />
        </label>
        <label className="block text-[11px] font-semibold text-slate-700 sm:col-span-2">
          Call to action (optional)
          <input
            value={callToAction}
            onChange={(event) => setCallToAction(event.target.value)}
            maxLength={180}
            placeholder="e.g. Message us to request a quote"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"
          />
        </label>
        <label className="block text-[11px] font-semibold text-slate-700 sm:col-span-2">
          Hashtags to include (optional)
          <input
            value={hashtags}
            onChange={(event) => setHashtags(event.target.value)}
            maxLength={160}
            placeholder="Johannesburg, localbusiness"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-slate-500">
          {brandName ? 'Brand: ' + brandName : 'No brand selected'}{engine === 'ollama' ? ' · Local model' : ''}
        </p>
        <button
          type="button"
          onClick={generate}
          disabled={loading || !title.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? 'Generating draft…' : 'Generate caption'}
        </button>
      </div>

      {error && <p role="alert" className="mt-2 text-[11px] text-rose-700">{error}</p>}
      {notice && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600">
          {engine === 'template-fallback' ? <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-700" /> : <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-violet-700" />}
          <span>{notice}</span>
        </p>
      )}
    </section>
  );
};
