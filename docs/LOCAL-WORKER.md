# NahaLabs Local Worker Protocol & Operation Guide

## 1. Role of the Local Worker

The **NahaLabs Local Publishing Worker** is a lightweight Node.js daemon running on the operator's local Windows machine. It connects to the NahaLabs Social Command Center cloud API, claims publishing jobs for configured accounts, stages them into the local AutoSocial repository, and reports progress updates.

---

## 2. API Contract Specification

All worker communication occurs over outbound HTTPS. No inbound ports or firewall holes are needed on the operator's machine.

### Authentication
The worker authenticates using a secure Worker Token (`WORKER_API_SECRET` / Bearer token) configured in the cloud settings:
```
Authorization: Bearer nh_live_sec_XXXXXXXXXXXXXXXX
X-Worker-Machine-Id: DESKTOP-NAHALABS-WIN11
```

### Endpoints

#### 1. Heartbeat & Health
- **Endpoint**: `POST /api/worker/heartbeat`
- **Request Body**:
  ```json
  {
    "workerId": "worker-za-jhb-01",
    "machineName": "DESKTOP-NAHALABS-01",
    "version": "1.0.0",
    "status": "IDLE",
    "activeJobsCount": 0,
    "installedPlatforms": ["instagram", "tiktok", "youtube"],
    "autoSocialPath": "C:\\NahaLabs\\AutoSocial"
  }
  ```
- **Response**: `{ "acknowledged": true, "pollIntervalMs": 5000 }`

#### 2. Poll for Pending Jobs
- **Endpoint**: `GET /api/worker/jobs/poll?limit=3`
- **Response**:
  ```json
  {
    "jobs": [
      {
        "jobId": "job_984729104",
        "contentId": "cnt_392817293",
        "brandId": "brand_naha_media",
        "accountHandle": "@nahalabs_africa",
        "platform": "tiktok",
        "videoUrl": "https://storage.nahalabs.com/videos/v_982734.mp4",
        "videoFilename": "product_launch.mp4",
        "caption": "Elevating African storytelling. #NahaLabs #Innovation #TechZA",
        "scheduledAt": "2026-09-20T14:00:00Z"
      }
    ]
  }
  ```

#### 3. Claim Job
- **Endpoint**: `POST /api/worker/jobs/:jobId/claim`
- **Response**: `{ "success": true, "leaseExpiresAt": "2026-09-20T14:15:00Z" }`

#### 4. Post Event / Progress Update
- **Endpoint**: `POST /api/worker/jobs/:jobId/events`
- **Body**:
  ```json
  {
    "status": "PUBLISHING",
    "step": "PLAYWRIGHT_UPLOAD_STARTED",
    "message": "Initiating Playwright session for TikTok @nahalabs_africa",
    "progressPct": 45,
    "timestamp": "2026-09-20T14:02:11Z"
  }
  ```

#### 5. Complete or Fail Job
- **Endpoint**: `POST /api/worker/jobs/:jobId/finish`
- **Body**:
  ```json
  {
    "status": "PUBLISHED", // or "FAILED"
    "platformPostUrl": "https://tiktok.com/@nahalabs_africa/video/7392847291",
    "errorDetails": null,
    "durationMs": 42100
  }
  ```

---

## 3. Worker Installation on Windows

1. Ensure Node.js 20+ and Playwright dependencies are installed.
2. Clone or extract the worker files into `C:\NahaLabs\Worker`.
3. Set your `.env` file:
   ```env
   NAHALABS_CLOUD_URL=https://ais-dev-22vdwzzmf73ytbssiprbqi-33647089183.europe-west1.run.app
   WORKER_TOKEN=nh_live_sec_replace_with_your_token
   AUTOSOCIAL_DIR=C:\NahaLabs\AutoSocial
   POLL_INTERVAL_MS=5000
   ```
4. Start the worker daemon:
   `node worker.mjs start`
