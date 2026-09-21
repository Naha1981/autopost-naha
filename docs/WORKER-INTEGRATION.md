# NahaLabs Social Command Center — Worker Integration

## Ownership

**NahaLabs owns:** clients, brands, content, approvals, the business calendar, publishing jobs, status, retry policy, and reporting.

**Windows Worker owns:** the secure connection between cloud and local execution, local media staging, AutoSocial selection, and execution monitoring.

**AutoSocial owns:** Playwright sessions, login state, browser automation, uploaders, and local posting.

## Publishing lifecycle

Content workflow:

```
DRAFT -> IN_REVIEW -> CHANGES_REQUESTED
                 -> APPROVED
```

Publishing lifecycle:

```
APPROVED -> QUEUED -> CLAIMED -> STAGED -> PUBLISHING -> PUBLISHED
                                      |
                                      +-> FAILED -> RETRY_PENDING -> CLAIMED
                                                       -> FAILED_PERMANENT
```

Each platform is independent. A single content item can therefore be PUBLISHED on one platform and FAILED on another.

## Scheduling

The NahaLabs `scheduledAt` field is authoritative.

When a scheduled item becomes due, the worker API creates platform jobs in Firestore. AutoSocial's scheduler is not the source of truth for the NahaLabs calendar.

## Worker API

All worker API routes require:

```
Authorization: Bearer <WORKER_API_SECRET>
X-Worker-Id: <worker id>
```

Routes:

- `POST /api/worker/heartbeat`
- `GET /api/worker/jobs/poll`
- `POST /api/worker/jobs/:id/claim`
- `POST /api/worker/jobs/:id/events`
- `POST /api/worker/jobs/:id/finish`
- `POST /api/worker/jobs/:id/fail`

The worker only makes outbound HTTPS requests. No public inbound port is required on the Windows laptop.

## Media

The browser uploads videos to Firebase Storage:

```
users/<firebase-user-id>/media/<file>
```

The cloud stores the durable media URL and storage key. The Windows worker downloads a temporary local copy and stages it into AutoSocial.

Browser object URLs are not used as publishing assets.

## Security

- Worker secrets are server/worker environment variables only.
- Firestore reads and writes are organization-scoped.
- Firebase Storage media is user-scoped.
- Social credentials and Playwright profiles remain local.
- The browser never calls AutoSocial localhost.
- The worker refuses to use a non-empty AutoSocial pending queue for a different job.

## Testing order

1. Run the web app in mock mode.
2. Sign in with Google.
3. Upload one short test video.
4. Create a post for one platform.
5. Confirm Firestore contains the content and QUEUED publishing job.
6. Start AutoSocial locally with a test account.
7. Start the NahaLabs worker.
8. Confirm the job becomes PUBLISHED in NahaLabs.
9. Only then test multi-platform publishing.

