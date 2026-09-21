# NahaLabs Social Command Center - Architecture Specification

## 1. System Overview

The **NahaLabs Social Command Center** is a distributed social publishing architecture composed of two isolated runtime tiers:

1. **NahaLabs Cloud Control Center (Public Web Application)**
   - Deployed on managed cloud infrastructure.
   - Provides client & brand management, video metadata, scheduling, CSV batch imports, and queue visibility.
   - Serves as the central state store (Cloud Firestore + Firebase Authentication).
   - **Zero-Trust for Social Credentials**: Does *not* store social media passwords, session tokens, or browser cookies.

2. **NahaLabs Local Publishing Worker (Private Machine Tier)**
   - Runs on the NahaLabs operator's dedicated Windows workstation.
   - Positioned alongside an existing **AutoSocial** installation (`localhost` / local filesystem).
   - Polls or listens for assigned publishing jobs over authenticated HTTPS channels.
   - Claims pending jobs, stages media to the local AutoSocial queue directory structure (`queue/<account>/<platform>/pending`), coordinates Playwright automation, and streams execution telemetry back to the cloud.

```
+------------------------------------------------------------------------------------+
|                             PUBLIC CLOUD ENVIRONMENT                              |
|                                                                                    |
|   +----------------------------------------------------------------------------+   |
|   |                  NahaLabs Social Command Center (Web App)                  |   |
|   |                                                                            |   |
|   |  - Brand & Account Workspace       - Content Composer & Preview            |   |
|   |  - CSV Importer & Validator        - Calendar & Multi-Platform Scheduler   |   |
|   |  - Real-time Publishing Queue      - Worker Health & Telemetry             |   |
|   +----------------------------------------------------------------------------+   |
|                                       |                                            |
|                                       v                                            |
|   +----------------------------------------------------------------------------+   |
|   |                       Cloud Firestore & Auth Database                      |   |
|   |  - organizations / brands / accounts                                       |   |
|   |  - content (with independent platform status tracking)                     |   |
|   |  - publishing_jobs (QUEUED, CLAIMED, PUBLISHING, PUBLISHED, FAILED)        |   |
|   |  - publishing_events (auditable execution logs)                            |   |
|   +----------------------------------------------------------------------------+   |
+------------------------------------------------------------------------------------+
                                        ^
                                        | Secure Outbound HTTPS Polling (HMAC / Bearer Auth)
                                        | (No inbound open ports required on local machine)
+------------------------------------------------------------------------------------+
|                        OPERATOR LOCAL TIER (Windows Laptop)                        |
|                                                                                    |
|   +----------------------------------------------------------------------------+   |
|   |                  NahaLabs Local Publisher Daemon (Worker)                  |   |
|   |                                                                            |   |
|   |  - Polls / Claims Approved Jobs    - Downloads & Verifies Media            |   |
|   |  - Manages Worker Session Keys     - Executes AutoSocial Adapter           |   |
|   |  - Reports Live Step Telemetry     - Captures Failure Stack Traces         |   |
|   +----------------------------------------------------------------------------+   |
|                                       |                                            |
|                     Local Filesystem & Process Triggers                            |
|                                       v                                            |
|   +----------------------------------------------------------------------------+   |
|   |                        AutoSocial Engine (Katzca)                          |   |
|   |                                                                            |   |
|   |  - Local Directory Structure: queue/<account>/<platform>/{pending,posted} |   |
|   |  - Persistent Browser Profiles: .profiles/<account>/<platform>             |   |
|   |  - Playwright Automation (Instagram, TikTok, YouTube)                      |   |
|   |  - FFmpeg Post-Processing & Codec Conformance                              |   |
|   +----------------------------------------------------------------------------+   |
+------------------------------------------------------------------------------------+
```

---

## 2. Core Entities & Collections

| Collection | Description | Access Scope |
| :--- | :--- | :--- |
| `organizations` | Tenant partition for NahaLabs and corporate clients | Org members |
| `brands` | Client brands under an organization (e.g. Acme Africa, Naha Media) | Org members |
| `social_accounts` | Configured platform targets (`instagram`, `tiktok`, `youtube`) | Org members & Worker |
| `content` | Master creative items (title, caption, video asset, target platforms) | Org members |
| `publishing_jobs` | Actionable dispatch units, tracking platform-specific life cycle | Org members & Worker |
| `publishing_events` | Granular log stream for monitoring and failure auditing | Read: Org, Write: Worker |

---

## 3. Platform Independence Guarantee

Content scheduled for multiple channels (e.g., Instagram + TikTok + YouTube) maintains **granular platform tracking**. A failure on TikTok (e.g., sound copyright flag or captcha challenge) does **not** fail the job for Instagram or YouTube.

Statuses per platform:
- `PENDING`: Content authored, not yet dispatched.
- `QUEUED`: Job created in cloud queue, waiting for worker claim.
- `CLAIMED`: Local worker acknowledged job and downloaded assets.
- `STAGED`: Asset placed in AutoSocial queue directory.
- `PUBLISHING`: Playwright session active on target platform.
- `PUBLISHED`: Verified post live on platform.
- `FAILED`: Failure encountered; detailed error code and retry capability available.

---

## 4. Decoupled Publisher Adapter Strategy

To prevent vendor lock-in to AutoSocial's internal directory structures or Playwright routines, the application features an explicit abstraction:

- `IPublisherAdapter`: Defines `publishJob(job)`, `verifyAccount(account)`, `cancelJob(jobId)`, `getQueueHealth()`.
- `MockPublisherAdapter`: In-browser / cloud simulation mode allowing 100% functionality without local daemon connectivity.
- `AutoSocialAdapter`: Bridges to the local filesystem structure and executes the AutoSocial pipeline.
- `OfficialApiAdapter`: (Future roadmap) Direct Meta Graph API, TikTok Content Posting API, and YouTube Data API v3 integration without rewriting domain controllers.
