# NahaLabs Zero-Cost Ocoya Replacement — Research & Build Runbook

**Review date:** 12 October 2026  
**Operating rule:** no paid AI APIs or mandatory AI subscriptions. Self-host where practical, use official social APIs, require approval before external publishing, and make model/provider dependencies replaceable.

## Executive decision

Do not build another disconnected scheduler. Evolve the existing NahaLabs Social Command Center and NahaLabs Content OS, and use a self-hosted publishing engine as a replaceable distribution adapter.

- **Product shell and job history:** [autopost-naha](https://github.com/Naha1981/autopost-naha).
- **Provider-free content/media pipeline:** [nahalabs-content-os](https://github.com/Naha1981/nahalabs-content-os).
- **Multi-client publishing engine candidate:** benchmark [BrightBean Studio](https://github.com/brightbeanxyz/brightbean-studio) against [Postmill AI](https://github.com/postmill-ai/postmill-app). Both are AGPL-3.0, so keep them as separate candidate services while reviewing network-use/source-disclosure obligations.
- **MIT-licensed local-first agent/publisher candidate:** [pendpost](https://github.com/pendpost/pendpost). Its human approval gate, MCP-native interface and local-first storage are useful; it is an early project, so verify client isolation and platform lanes before using it for multiple paying customers.
- **Local text AI:** [Ollama](https://github.com/ollama/ollama) with [Qwen3 4B Q4_K_M](https://ollama.com/library/qwen3:4b) as the first test model. The Ollama runtime is MIT and this model package lists Apache-2.0; verify the exact model metadata and performance on our hardware before production.
- **Local creative assembly:** reuse existing NahaLabs FFmpeg/eSpeak production; add ComfyUI only where a local image/video model and its weights have acceptable licences.
- **Social listening:** [Harken](https://github.com/VladUZH/harken) is a promising MIT-licensed local research/listening component, not a replacement for the publishing layer.

## Existing NahaLabs assets found

1. **autopost-naha / Social Command Center** — React 19, Vite, Tailwind, Express, Firebase/Firestore, brands, content repository, calendar, accounts, publish queue, job events and local publishing worker. The UI currently focuses on short-form video for Instagram, TikTok and YouTube.
2. **mixpost-nahalabs** — a substantial user-owned fork of [Mixpost](https://github.com/inovector/mixpost), PHP/Laravel. Upstream repository licence is MIT, but its README expressly keeps Lite features distinct from its commercial Pro edition. Evaluate feature limits before treating it as the full product.
3. **nahalabs-content-os / Reactivate** — deterministic/provider-free content workflow, production jobs, local eSpeak voiceovers, SRT captions, FFmpeg muxing, rendering, scheduling and performance services. Reuse it instead of duplicating production capabilities.
4. **demand-rader / Demand Radar** — evidence-first demand research and social-signal pipeline. Use it to discover commercial topics and possible buyer intent; engagement alone is not proof of a buyer.
5. **Notion source of truth:** Social Media → BrightBean Studio distribution layer, Mixpost publishing engine, Social Post Intelligence and Shared MCP Capability Layer blueprints. This runbook aligns to those decisions.

## Target product

**NahaLabs Social Revenue OS** — a self-owned, multi-client content system that covers the useful parts of Ocoya without a paid AI dependency.

- Client/brand profiles, audience, voice, services, prohibited claims and approved proof.
- Brief and campaign planner; repeatable content pillars and calendars.
- Local-model caption generation, channel-specific variants, rewrite, hooks, calls to action and hashtag suggestions.
- Reusable content templates for images, carousels and short videos.
- Media library, cropping/resizing, subtitles, voiceover and branded video assembly.
- Calendar, queues, drafts, human/client approval and audit trail.
- Publishing through approved platform APIs or a replaceable publishing adapter.
- Post links, publish status, available platform analytics and measurement.
- Optional engagement inbox and lead attribution; measure enquiries and revenue, not just views.
- One common data model across RevenueDesk, Flavourly, CargoIQ and NahaLabs marketing.

## Architecture

```text
Notion strategy / client brief / Demand Radar evidence
                        |
                        v
        NahaLabs Social Revenue OS (own product)
        - tenants, brands, campaigns, content records
        - local AI gateway (Ollama or deterministic fallback)
        - templates, QA, approval, attribution
                        |
             approved content only
                        v
           Publishing adapter interface
                 /             \
                v               v
    BrightBean self-hosted     Native official APIs
    publisher (REST/MCP)       when justified
                \               /
                 v             v
                 Social networks
                        |
                platform post IDs/URLs
                        |
                        v
       NahaLabs metrics + lead/revenue attribution
```

Keep BrightBean, Postmill or Postiz separate from proprietary NahaLabs application code unless legal review approves another arrangement. These are AGPL-3.0 projects; network-use/source-disclosure obligations may apply when modified and served. Do not embed their code into a closed NahaLabs binary or promise customers the combined product remains proprietary without review. pendpost is MIT and can be a more permissive local-first publishing option, but it is early-stage and not a drop-in substitute for an agency-grade multi-tenant platform. Mixpost is MIT, but its upstream repository deliberately separates Lite features from commercial Pro features. This is a product and licensing trade-off, not a reason to buy Pro.

Do not expose the model runtime's port to the public internet. Keep Ollama on loopback/private network, authenticate application requests, validate input, rate-limit generation, and never put social tokens in prompts or model context.

## Candidate stack and licence/cost gate

| Need | Candidate | Decision / caveat |
|---|---|---|
| Multi-client social publishing, calendar, approvals, inbox, analytics | [BrightBean Studio](https://github.com/brightbeanxyz/brightbean-studio) | Best existing candidate from our current research and already aligned with the Notion blueprint. AGPL-3.0; self-host via Docker/Postgres. Validate every required connector, actual publishing and per-client isolation. Review network-source obligations before commercial productizing. |
| Broader all-in-one benchmark | [Postmill AI](https://github.com/postmill-ai/postmill-app) | AGPL-3.0. README advertises 45+ channels, media tools, analytics, inbox, API and MCP; AI is BYOK by default, so local Ollama integration must be proven. Node 24/pnpm + PostgreSQL + Redis; benchmark it in a disposable test deployment, not as our source of truth. |
| MIT local-first publisher / MCP worker candidate | [pendpost](https://github.com/pendpost/pendpost) | MIT, local JSON storage, loopback-first, MCP-native, fail-closed human approval. Useful for safer agent actions and local publishing. Early-stage/small maintainer base; several lanes (Reddit/Pinterest/TikTok/Google Business Profile) are explicitly beta and multi-tenant/client isolation needs independent validation. |
| Alternative publisher | [Mixpost Lite](https://github.com/inovector/MixpostApp) | MIT code; Laravel/PHP. Lite feature set is intentionally distinct from Pro. Existing NahaLabs fork is not the same tech stack as autopost-naha. |
| Alternative publisher | [Postiz](https://github.com/gitroomhq/postiz-app) | AGPL-3.0. Self-hostable and supports many channels. Some built-in AI workflows expect provider keys; make our own local AI gateway authoritative rather than assuming all bundled AI works offline. |
| Local text model runtime and first model | [Ollama](https://github.com/ollama/ollama) + [Qwen3 4B](https://ollama.com/library/qwen3:4b) | Ollama runtime MIT; Qwen3 4B Q4_K_M model package lists Apache-2.0 and a ~2.5 GB model download. Test memory, latency and output quality locally; weight file size is not the same as total RAM/VRAM needed. |
| Local image generation | [ComfyUI](https://github.com/comfyanonymous/ComfyUI) + [FLUX.1-schnell](https://github.com/black-forest-labs/flux/blob/main/model_cards/FLUX.1-schnell.md) | ComfyUI GPL-3.0; FLUX.1-schnell model card lists Apache-2.0 and supports local inference. 12B parameters: benchmark actual memory/speed before promising reliable local image generation. |
| Agent-native short-video renderer | [HyperFrames](https://github.com/heygen-com/hyperframes) | Apache-2.0, actively released (v0.8.135 in October 2026), HTML/CSS-based deterministic MP4 composition with agent-oriented workflows and no per-render vendor fee. **Preferred for new automated-video product features.** Audit third-party media/fonts separately. |
| Existing Remotion videos | [Remotion](https://www.remotion.dev/docs/license/pricing) | Current official pricing says its Automators product-rendering tier is $0.01 per render with $100/month minimum, even though a free license exists for individuals/companies up to 3 people under terms. Keep existing local use only where license fits; do not make it the core high-volume SaaS renderer. |
| Short-video automation | [MoneyPrinterTurbo](https://github.com/Ahsan-Dogar/MoneyPrinterTurbo) | MIT. Already in our tool stack. It can assemble script/footage/subtitles/music, but default integrations may request external provider keys; audit provider calls and route text generation through local Ollama, using local/properly licensed media. |
| Local voiceover | [Kokoro-82M](https://github.com/hexgrad/kokoro) + [model card](https://huggingface.co/hexgrad/Kokoro-82M) | Apache-2.0 inference library and model weights. Test voice quality/language coverage on South African English; retain existing eSpeak as a simple offline fallback. |
| Local transcription | [Whisper](https://github.com/openai/whisper) | MIT speech-to-text/translation. Reuse existing Content OS subtitle tools first; add Whisper only where accurate transcript timing is missing. |
| Social listening | [Harken](https://github.com/VladUZH/harken) | MIT, local SQLite, no-key defaults include Hacker News and Bluesky; other connector coverage/configuration must be tested. Not a universal Facebook/Instagram/LinkedIn listener. |
| Video assembly | [FFmpeg](https://github.com/FFmpeg/FFmpeg) | Already in NahaLabs stack. Build options/codecs affect licence obligations; preserve notices and audit packaged binaries before redistribution. |
| Workflow glue | [Activepieces](https://github.com/activepieces/activepieces) | MIT core; enterprise folders/features are commercial-licensed. Use only if our existing scheduler/API is insufficient. Avoid making paid/EE features a required dependency. |
| Social intent research | Existing Demand Radar + Jev Social / bounded browser sources | Research/discovery only, with source attribution and exact permalink verification. Public code does not mean the target site's data/API is free. |
| Captions/voiceover/subtitles | NahaLabs Content OS + local models + eSpeak/FFmpeg | Reuse the existing provider-free pipeline; deterministic fallback works without a cloud provider. |
| Stock media | User-owned or permissively licensed assets; optional official provider connector | Do not make any paid stock API a dependency. Record asset provenance and licence. |

## Official social API reality

Open source supplies the software, not permission to publish on every social network. Register app credentials and request the minimum official scopes. API access, permissions, audit, quotas and account eligibility can constrain use:

- **TikTok:** its Content Posting API guide (last updated 4 August 2026) requires an app, the Content Posting API product, approved `video.publish` permission and user authorization. Posts from unaudited clients are restricted to private viewing until audit. [Official instructions](https://developers.tiktok.com/docs/en/content-posting-api-get-started).
- **YouTube:** uploading through `videos.insert` requires OAuth and is quota-limited. [Official API docs](https://developers.google.com/youtube/v3/docs/videos/insert).
- **LinkedIn:** the Posts API requires appropriate member or organization permissions; organization posting is restricted to members with certain Page roles. [Official Posts API docs](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/posts-api?tabs=http&view=li-lms-2023-03).
- **Meta / Instagram:** production publishing depends on supported account types, product-specific permissions, token grants and review; verify the current official requirements against the accounts we actually manage before promising automated publishing.
- Avoid making browser automation the default publisher where official APIs are available. Do not bypass login challenges, private content, platform throttles or access controls.

## First feature committed on the feature branch

Branch: `feat/zero-cost-ai-caption-studio`

- A **Local AI Caption Studio** is embedded in the existing content composer.
- Inputs include target platform, tone, objective, audience, CTA and requested hashtags.
- Server route is `POST /api/ai/generate-caption`.
- If `OLLAMA_BASE_URL` is configured, the server calls the local Ollama `/api/chat` endpoint; no external model provider is called by this route.
- If Ollama is not configured or errors, the system returns a deterministic template caption and explicitly labels it as a non-LLM fallback.
- Route requires a valid Firebase bearer token except an opt-in localhost-only development bypass.
- Rate limited to 20 requests per actor per minute; model calls have a bounded timeout.
- Nothing auto-publishes. A human must review the caption and use the existing publishing workflow.
- The existing content data model has a single caption shared across selected channels. Per-platform caption storage is a next milestone; the UI warns when multiple channels are selected.

This is a first code slice, **not yet verified as production-ready**. GitHub Actions passed dependency installation, server/worker syntax checks, TypeScript checking, and the Vite production build on code commit `f164e6c`; the subsequent change was documentation-only. Local Ollama inference, authentication behavior against a live Firebase setup, rate limits and real platform publishing have not been end-to-end tested. Keep the PR in draft until those runtime checks pass.

## Immediate run/test procedure

1. Install Ollama locally from [ollama.com](https://ollama.com/) and use a suitably licensed small model; do not expose port 11434 to public ingress.
2. In a terminal at the repository root, configure `.env` from `.env.example` and set `OLLAMA_BASE_URL=http://127.0.0.1:11434`, a model name you have already pulled, and a strong Firebase Admin configuration for authenticated use. Leave `ALLOW_LOCAL_AI_DEMO=false` unless testing locally.
3. Pull the selected model with Ollama, then validate directly against its local API.
4. Run `npm run check` and `npm run build`. For Vite development, run the Express service at port 8080 and Vite at port 3000; the Vite proxy forwards `/api` to the local Express service.
5. Test the AI composer with a brand description and topic. Confirm the API result marks `engine=ollama`, then stop Ollama and confirm the route produces a clearly labeled fallback. Verify unauthenticated non-local requests receive 401 and burst requests receive 429.
6. Review the generated caption, verify all factual claims, and verify the existing publish queue is not triggered by generation.

## Build sequence and acceptance gates

### Phase 1 — Local content generation (now)
- [x] Create branch and add Local AI Caption Studio slice.
- [x] GitHub Actions passed dependency installation, server/worker syntax checks, TypeScript checking and production build on code commit `f164e6c`.
- [ ] Add tests for input validation, rate limits, auth, local model success, timeout and fallback.
- [ ] Test selected model quality on South African client briefs and record latency on actual hardware.
- [ ] Make per-platform captions first-class in the content schema.

### Phase 2 — Proper creative studio
- Add text, image, carousel and video content records, separate from the current video-only requirement.
- Add brand kits, templates, image dimensions and platform previews.
- Reuse Content OS for FFmpeg/eSpeak/subtitles. Benchmark HyperFrames as the no-per-render-fee renderer for new automated video. Use ComfyUI + FLUX.1-schnell only where hardware and weights' commercial licence are approved; test Kokoro for voiceovers and keep eSpeak as fallback.
- Avoid making Remotion the core render engine for a paid SaaS: its current Automators tier lists a $100/month minimum.
- Add source files, generated variants, revision history and provenance.

### Phase 3 — Approved publishing
- Run BrightBean locally with Docker Compose and connect it via a least-privilege NahaLabs adapter.
- Use read-only/discovery credentials first; draft/approval mode by default.
- Implement per-client tenant isolation, external post IDs, idempotency, backoff/retries and a global pause switch.
- Audit API scopes, account eligibility and each platform's publishing outcome; never claim coverage before a real test.

### Phase 4 — Analytics and revenue learning
- Import platform metrics at supported intervals and store their platform, time and definition.
- Attribute leads/enquiries where the customer journey permits, connect RevenueDesk/Flavourly opportunities, and avoid treating views/likes as revenue.
- Add social-listening signals from Demand Radar/Harken with verified post URLs and provenance.

### Phase 5 — Harden and productize
- Threat model tenant and credential boundaries, run dependency and secrets scans, enforce access controls and retention.
- Document AGPL/MIT/Apache/model/asset licenses and software bills of materials.
- Measure end-to-end time saved and qualified enquiries generated before expanding the feature set.

## Definition of done

- No API key to a paid AI provider is required.
- Local-model and non-LLM fallback states are visibly distinct.
- No caption generation can publish content.
- Every external write has an accountable client/brand, authenticated actor, approval state, idempotency key and audit event.
- No social credential is exposed to a prompt, browser bundle or log.
- A real connected-account test proves each platform/action we claim to support.
- Free means zero software subscription for the core self-hosted stack; it does **not** mean zero hardware, electricity, maintenance or hosting cost.
