# AutoSocial Integration Reference & Protocol

## 1. AutoSocial Overview

Reference Repository: [Katzca/AutoSocial](https://github.com/Katzca/AutoSocial)

AutoSocial is a self-hosted desktop automation suite using Playwright and Node.js designed to upload short-form video content to Instagram, TikTok, and YouTube via persistent Chromium browser contexts.

### Key AutoSocial Architectural Components

1. **Queue Directory Hierarchy**:
   ```
   AutoSocial/
   ├── queue/
   │   └── <account_id_or_slug>/
   │       ├── instagram/
   │       │   ├── pending/   <-- video files with companion .txt/.json metadata
   │       │   ├── posted/    <-- archived after successful upload
   │       │   └── failed/    <-- stored on upload error
   │       ├── tiktok/
   │       │   └── ...
   │       └── youtube/
   │           └── ...
   ```

2. **Persistent Browser Session Profiles**:
   ```
   AutoSocial/
   └── .profiles/
       └── <account_id_or_slug>/
           ├── instagram/     <-- Chromium user data directory (cookies, localStorage)
           ├── tiktok/
           └── youtube/
   ```

3. **FFmpeg & Media Normalization**:
   - Aspect Ratio: 9:16 (1080x1920) recommended.
   - Codec: H.264 / AAC audio.
   - AutoSocial provides optional video watermarking, scaling, and duration trimming before browser ingestion.

---

## 2. NahaLabs Integration Rulebook

### Strict Isolation Rules
1. **No Password Ingestion**: The cloud NahaLabs app never requests, stores, or transmits passwords for Instagram, TikTok, or YouTube.
2. **Local Session Seeding**: Account login occurs solely inside the operator's local Playwright browser during initial connection via the command:
   `node worker.mjs login --account <account_id> --platform <platform>`
3. **No Cloud Exposure of `.profiles`**: The `.profiles/` directory remains strictly in local Windows NTFS storage. It is excluded from version control and cloud synchronizations.
4. **Queue Staging Protocol**: The NahaLabs Local Worker writes directly into `queue/<account>/<platform>/pending/` with standardized companion metadata:
   - Video file: `<job_id>.mp4`
   - Companion JSON: `<job_id>.json` containing title, caption, hashtags, and schedule constraints.

---

## 3. Worker Execution Flow

```
+---------------------------+
| Cloud Job State: "QUEUED" |
+---------------------------+
              |
              v (Worker polls via GET /api/worker/jobs/poll)
+---------------------------+
| Worker Claims Job         |
| Cloud State -> "CLAIMED"  |
+---------------------------+
              |
              v (Worker fetches video bytes via authenticated signed stream)
+---------------------------+
| Stage Media to Local Disk |
| Path: queue/<acc>/<plat>/ |
| Cloud State -> "STAGED"   |
+---------------------------+
              |
              v (Worker invokes AutoSocial execution adapter)
+---------------------------+
| AutoSocial Automation Run |
| Launch Playwright Context |
| Cloud State: "PUBLISHING" |
+---------------------------+
              |
      +-------+-------+
      |               |
   (Success)       (Error)
      |               |
      v               v
+-------------+ +---------------------------+
| Move to     | | Move to queue/.../failed  |
| posted/     | | Cloud State -> "FAILED"   |
| Cloud State | | Error message & telemetry |
| "PUBLISHED" | +---------------------------+
+-------------+
```
