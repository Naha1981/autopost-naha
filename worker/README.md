# NahaLabs Windows Worker

This worker runs on the private Windows operator laptop and connects the NahaLabs Social Command Center to the existing local AutoSocial installation.

## Architecture

```
NahaLabs UI
  -> Firebase Auth / Firestore / Firebase Storage
  -> HTTPS worker API
  -> Windows NahaLabs Worker
  -> http://127.0.0.1:3000 AutoSocial
  -> Instagram / TikTok / YouTube
```

The worker never uploads Playwright profiles, cookies, passwords, or browser sessions.

## Setup

1. Copy `worker/.env.example` to `worker/.env`.
2. Set `NAHALABS_CLOUD_URL`.
3. Set `WORKER_TOKEN` to the same value as the server `WORKER_API_SECRET`.
4. Keep AutoSocial local at `C:\Users\Thabiso\AutoSocial` unless you deliberately use another path.
5. Start AutoSocial locally.
6. Verify the connection:

```powershell
node worker/nahalabs-worker.mjs test-connection
```

7. Log a social account into the existing AutoSocial profile:

```powershell
node worker/nahalabs-worker.mjs login --account @yourhandle --platform instagram
```

8. Start the worker:

```powershell
node worker/nahalabs-worker.mjs start
```

## Publishing safety

The worker refuses to stage a NahaLabs job when the selected AutoSocial pending queue already contains another video. This prevents a NahaLabs job from triggering the wrong local queue item.

The worker stops AutoSocial scheduling by default before executing a NahaLabs job. NahaLabs therefore remains the business calendar and AutoSocial remains the publishing engine.

Set `AUTOSOCIAL_SCHEDULER_ENABLED=true` only when you deliberately want AutoSocial's own scheduler active.

## Commands

- `start` — continuously poll and execute cloud jobs.
- `test-connection` — verify the cloud worker API and AutoSocial.
- `login` — start a local AutoSocial login session for an account/platform.

