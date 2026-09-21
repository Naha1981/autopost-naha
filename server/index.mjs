
import express from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'flavourly-27292';
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-b5e55ab5-11bb-454a-b0c3-2107e473122c';
const WORKER_ORGANIZATION_ID = process.env.WORKER_ORGANIZATION_ID || 'org_nahalabs_hq';
const WORKER_API_SECRET = process.env.WORKER_API_SECRET || '';
const LEASE_MS = Number(process.env.WORKER_LEASE_MS || 900000);
const DEFAULT_MAX_RETRIES = Number(process.env.DEFAULT_MAX_RETRIES || 3);

let db = null;

try {
  const existing = admin.apps.length ? admin.app() : null;
  let app = existing;
  if (!app) {
    const json = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
    const credential = json
      ? admin.credential.cert(JSON.parse(json))
      : admin.credential.applicationDefault();
    app = admin.initializeApp({ credential, projectId: PROJECT_ID });
  }
  db = getFirestore(app, DATABASE_ID);
} catch (error) {
  console.warn('[server] Firebase Admin is not ready: ' + error.message);
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

function nowIso() {
  return new Date().toISOString();
}

function constantTimeEquals(leftValue, rightValue) {
  const left = Buffer.from(String(leftValue || ''));
  const right = Buffer.from(String(rightValue || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function authenticateWorker(req, res, next) {
  if (!WORKER_API_SECRET) return res.status(503).json({ ok: false, error: 'WORKER_API_SECRET is not configured.' });
  const header = String(req.get('authorization') || '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!constantTimeEquals(token, WORKER_API_SECRET)) return res.status(401).json({ ok: false, error: 'Invalid worker credentials.' });
  req.workerId = String(req.get('x-worker-id') || 'unknown-worker');
  next();
}

function requireDb(res) {
  if (!db) {
    res.status(503).json({ ok: false, error: 'Firestore Admin credentials are not configured.' });
    return false;
  }
  return true;
}

function jobRef(id) {
  return db.collection('publishing_jobs').doc(id);
}

function contentRef(id) {
  return db.collection('content').doc(id);
}

function recomputeGlobalStatus(content) {
  const statuses = (content.platforms || []).map(function (platform) {
    return (content.platformStatus || {})[platform];
  }).filter(Boolean);

  if (!statuses.length) return 'DRAFT';
  if (statuses.every(function (status) { return status === 'PUBLISHED'; })) return 'PUBLISHED';
  if (statuses.every(function (status) { return status === 'FAILED_PERMANENT'; })) return 'FAILED_PERMANENT';
  if (statuses.every(function (status) { return status === 'FAILED'; })) return 'FAILED';
  if (statuses.some(function (status) { return ['PUBLISHING', 'STAGED', 'CLAIMED'].includes(status); })) return 'PUBLISHING';
  if (statuses.some(function (status) { return ['QUEUED', 'RETRY_PENDING'].includes(status); })) return 'QUEUED';
  if (statuses.some(function (status) { return status === 'PUBLISHED'; })) return 'PARTIAL';
  return 'DRAFT';
}

async function addEvent(job, status, step, message, progressPct, level) {
  const ref = db.collection('publishing_events').doc();
  await ref.set({
    id: ref.id,
    organizationId: WORKER_ORGANIZATION_ID,
    jobId: job.id,
    contentId: job.contentId,
    platform: job.platform,
    status,
    step,
    message,
    progressPct: progressPct == null ? null : progressPct,
    timestamp: nowIso(),
    level: level || 'info',
  });
}

async function resetExpiredClaims() {
  const snapshot = await db.collection('publishing_jobs')
    .where('organizationId', '==', WORKER_ORGANIZATION_ID)
    .where('status', '==', 'CLAIMED')
    .limit(50)
    .get();

  for (const item of snapshot.docs) {
    const job = item.data();
    if (!job.leaseExpiresAt || Date.parse(job.leaseExpiresAt) > Date.now()) continue;

    await db.runTransaction(async function (tx) {
      const currentSnap = await tx.get(item.ref);
      if (!currentSnap.exists || currentSnap.data().status !== 'CLAIMED') return;

      const contentReference = contentRef(job.contentId);
      const contentSnap = await tx.get(contentReference);

      tx.set(item.ref, {
        status: 'QUEUED',
        workerId: null,
        workerMachineName: null,
        claimedAt: null,
        leaseExpiresAt: null,
        updatedAt: nowIso(),
      }, { merge: true });

      if (contentSnap.exists) {
        const content = contentSnap.data();
        const platformStatus = Object.assign({}, content.platformStatus || {});
        platformStatus[job.platform] = 'QUEUED';
        tx.set(contentReference, {
          platformStatus,
          status: recomputeGlobalStatus(Object.assign({}, content, { platformStatus })),
          updatedAt: nowIso(),
        }, { merge: true });
      }
    });
  }
}

async function promoteDueScheduledContent() {
  const snapshot = await db.collection('content')
    .where('organizationId', '==', WORKER_ORGANIZATION_ID)
    .where('status', '==', 'SCHEDULED')
    .limit(50)
    .get();

  for (const item of snapshot.docs) {
    const content = item.data();
    const dueAt = content.scheduledAt ? Date.parse(content.scheduledAt) : NaN;
    if (!Number.isFinite(dueAt) || dueAt > Date.now()) continue;

    const accountSnapshot = await db.collection('social_accounts')
      .where('organizationId', '==', WORKER_ORGANIZATION_ID)
      .where('brandId', '==', content.brandId)
      .get();

    const accounts = new Map();
    accountSnapshot.docs.forEach(function (docSnap) {
      accounts.set(docSnap.data().platform, docSnap.data());
    });

    await db.runTransaction(async function (tx) {
      const latest = await tx.get(item.ref);
      if (!latest.exists || latest.data().status !== 'SCHEDULED') return;

      const current = latest.data();
      const platforms = Array.isArray(current.platforms) ? current.platforms : [];
      const jobsToWrite = [];
      for (const platform of platforms) {
        const id = 'job_' + current.id + '_' + platform;
        jobsToWrite.push({
          id,
          ref: jobRef(id),
          platform,
          existing: await tx.get(jobRef(id)),
        });
      }

      const platformStatus = Object.assign({}, current.platformStatus || {});
      let changed = false;

      for (const entry of jobsToWrite) {
        if (platformStatus[entry.platform] !== 'IDLE') continue;
        if (entry.existing.exists) {
          const existingStatus = entry.existing.data().status;
          if (existingStatus === 'PUBLISHED' || existingStatus === 'FAILED_PERMANENT') continue;
        }

        const account = accounts.get(entry.platform);
        tx.set(entry.ref, {
          id: entry.id,
          organizationId: WORKER_ORGANIZATION_ID,
          contentId: current.id,
          brandId: current.brandId,
          platform: entry.platform,
          accountHandle: account && account.handle ? account.handle : '@brand_' + current.brandId + '_' + entry.platform,
          status: 'QUEUED',
          scheduledAt: current.scheduledAt || nowIso(),
          retryCount: entry.existing.exists ? Number(entry.existing.data().retryCount || 0) : 0,
          maxRetries: entry.existing.exists ? Number(entry.existing.data().maxRetries || DEFAULT_MAX_RETRIES) : DEFAULT_MAX_RETRIES,
          createdAt: entry.existing.exists ? (entry.existing.data().createdAt || nowIso()) : nowIso(),
          updatedAt: nowIso(),
        }, { merge: true });
        platformStatus[entry.platform] = 'QUEUED';
        changed = true;
      }

      if (changed) {
        const nextContent = Object.assign({}, current, { platformStatus });
        tx.set(item.ref, {
          platformStatus,
          status: recomputeGlobalStatus(nextContent),
          updatedAt: nowIso(),
        }, { merge: true });
      }
    });
  }
}

app.get('/health', function (_req, res) {
  res.json({
    ok: true,
    service: 'nahalabs-social-command-center',
    workerApiConfigured: Boolean(WORKER_API_SECRET),
    firestoreConfigured: Boolean(db),
  });
});

app.post('/api/worker/heartbeat', authenticateWorker, async function (req, res) {
  if (!requireDb(res)) return;

  try {
    const body = req.body || {};
    const workerId = String(body.workerId || req.workerId);
    const heartbeat = {
      workerId,
      organizationId: WORKER_ORGANIZATION_ID,
      machineName: String(body.machineName || 'unknown-machine'),
      version: String(body.version || 'unknown'),
      status: ['ONLINE', 'BUSY', 'OFFLINE'].includes(body.status) ? body.status : 'ONLINE',
      lastSeenAt: nowIso(),
      installedPlatforms: Array.isArray(body.installedPlatforms) ? body.installedPlatforms : [],
      autoSocialPath: String(body.autoSocialPath || ''),
      activeJobsCount: Number(body.activeJobsCount || 0),
      accounts: Array.isArray(body.accounts) ? body.accounts : [],
    };

    await db.collection('workers').doc(workerId).set(heartbeat, { merge: true });
    res.json({ acknowledged: true, workerId });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/worker/jobs/poll', authenticateWorker, async function (req, res) {
  if (!requireDb(res)) return;

  try {
    await resetExpiredClaims();
    await promoteDueScheduledContent();

    const limit = Math.min(Math.max(Number(req.query.limit || 2), 1), 5);
    const snapshot = await db.collection('publishing_jobs')
      .where('organizationId', '==', WORKER_ORGANIZATION_ID)
      .where('status', 'in', ['QUEUED', 'RETRY_PENDING'])
      .limit(25)
      .get();

    const jobs = [];
    for (const docSnap of snapshot.docs) {
      const job = docSnap.data();
      const scheduledAt = job.scheduledAt ? Date.parse(job.scheduledAt) : 0;
      if (Number.isFinite(scheduledAt) && scheduledAt > Date.now()) continue;

      const contentSnap = await contentRef(job.contentId).get();
      if (!contentSnap.exists) continue;

      const content = contentSnap.data();
      jobs.push({
        jobId: job.id,
        contentId: job.contentId,
        brandId: job.brandId,
        platform: job.platform,
        accountHandle: job.accountHandle,
        videoUrl: content.videoUrl,
        mediaStorageKey: content.mediaStorageKey || null,
        videoFilename: content.mediaStorageKey ? String(content.mediaStorageKey).split('/').pop() : job.id + '.mp4',
        caption: content.caption || '',
        title: content.title || '',
        scheduledAt: job.scheduledAt || null,
        retryCount: Number(job.retryCount || 0),
        maxRetries: Number(job.maxRetries || DEFAULT_MAX_RETRIES),
      });

      if (jobs.length >= limit) break;
    }

    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/worker/jobs/:jobId/claim', authenticateWorker, async function (req, res) {
  if (!requireDb(res)) return;

  try {
    const workerId = String(req.body && req.body.workerId || req.workerId);
    const machineName = String(req.body && req.body.machineName || 'unknown-machine');
    const jobId = req.params.jobId;
    const leaseExpiresAt = new Date(Date.now() + LEASE_MS).toISOString();

    const claimed = await db.runTransaction(async function (tx) {
      const reference = jobRef(jobId);
      const snap = await tx.get(reference);
      if (!snap.exists) throw new Error('Publishing job not found.');

      const current = snap.data();
      if (current.organizationId !== WORKER_ORGANIZATION_ID) throw new Error('Job belongs to another organization.');
      if (!['QUEUED', 'RETRY_PENDING'].includes(current.status)) throw new Error('Job is not claimable from status ' + current.status);

      const dueAt = current.scheduledAt ? Date.parse(current.scheduledAt) : 0;
      if (Number.isFinite(dueAt) && dueAt > Date.now()) throw new Error('Job is not due yet.');

      const contentReference = contentRef(current.contentId);
      const contentSnap = await tx.get(contentReference);

      const nextJob = Object.assign({}, current, {
        status: 'CLAIMED',
        workerId,
        workerMachineName: machineName,
        claimedAt: nowIso(),
        leaseExpiresAt,
        updatedAt: nowIso(),
      });

      tx.set(reference, nextJob, { merge: true });

      if (contentSnap.exists) {
        const content = contentSnap.data();
        const platformStatus = Object.assign({}, content.platformStatus || {});
        platformStatus[current.platform] = 'CLAIMED';
        const nextContent = Object.assign({}, content, { platformStatus, status: 'PUBLISHING' });
        tx.set(contentReference, {
          platformStatus,
          status: recomputeGlobalStatus(nextContent),
          updatedAt: nowIso(),
        }, { merge: true });
      }

      return nextJob;
    });

    await addEvent(claimed, 'CLAIMED', 'WORKER_CLAIM', 'Worker ' + workerId + ' claimed job ' + jobId + '.', 10);
    res.json({ success: true, job: claimed, leaseExpiresAt });
  } catch (error) {
    res.status(409).json({ success: false, error: error.message });
  }
});

async function ensureOwnedJob(jobId, workerId) {
  const snap = await jobRef(jobId).get();
  if (!snap.exists) throw new Error('Publishing job not found.');
  const job = snap.data();
  if (job.organizationId !== WORKER_ORGANIZATION_ID) throw new Error('Job belongs to another organization.');
  if (job.workerId !== workerId) throw new Error('Worker does not own this lease.');
  if (!['CLAIMED', 'STAGED', 'PUBLISHING'].includes(job.status)) throw new Error('Job is not active: ' + job.status);
  return job;
}

app.post('/api/worker/jobs/:jobId/events', authenticateWorker, async function (req, res) {
  if (!requireDb(res)) return;

  try {
    const workerId = String(req.body && req.body.workerId || req.workerId);
    const job = await ensureOwnedJob(req.params.jobId, workerId);
    const status = String(req.body && req.body.status || 'PUBLISHING');
    const allowed = ['CLAIMED', 'STAGED', 'PUBLISHING'];
    if (!allowed.includes(status)) return res.status(400).json({ ok: false, error: 'Use finish/fail for terminal states.' });

    await addEvent(
      job,
      status,
      String(req.body && req.body.step || 'WORKER_EVENT'),
      String(req.body && req.body.message || ''),
      req.body && req.body.progressPct,
      req.body && req.body.level || 'info'
    );

    await jobRef(job.id).set({
      status,
      updatedAt: nowIso(),
      leaseExpiresAt: new Date(Date.now() + LEASE_MS).toISOString(),
    }, { merge: true });

    const contentSnapshot = await contentRef(job.contentId).get();
    if (contentSnapshot.exists) {
      const content = contentSnapshot.data();
      const platformStatus = Object.assign({}, content.platformStatus || {});
      platformStatus[job.platform] = status;
      await contentRef(job.contentId).set({
        platformStatus,
        status: recomputeGlobalStatus(Object.assign({}, content, { platformStatus })),
        updatedAt: nowIso(),
      }, { merge: true });
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(409).json({ ok: false, error: error.message });
  }
});

async function finalizeJob(jobId, workerId, success, payload) {
  const reference = jobRef(jobId);
  const result = await db.runTransaction(async function (tx) {
    const snap = await tx.get(reference);
    if (!snap.exists) throw new Error('Publishing job not found.');

    const current = snap.data();
    if (current.organizationId !== WORKER_ORGANIZATION_ID) throw new Error('Job belongs to another organization.');
    if (current.workerId !== workerId) throw new Error('Worker does not own this lease.');

    const contentReference = contentRef(current.contentId);
    const contentSnap = await tx.get(contentReference);

    const retryCount = Number(current.retryCount || 0);
    const maxRetries = Number(current.maxRetries || DEFAULT_MAX_RETRIES);
    const nextStatus = success
      ? 'PUBLISHED'
      : (retryCount + 1 < maxRetries ? 'RETRY_PENDING' : 'FAILED_PERMANENT');

    const jobUpdate = {
      status: nextStatus,
      updatedAt: nowIso(),
      leaseExpiresAt: null,
      ...(success
        ? { publishedAt: nowIso(), postUrl: payload && payload.platformPostUrl || null, errorMessage: null }
        : { failedAt: nowIso(), retryCount: retryCount + 1, errorMessage: String(payload && payload.errorDetails || 'Publishing failed.') }),
    };

    tx.set(reference, jobUpdate, { merge: true });

    if (contentSnap.exists) {
      const content = contentSnap.data();
      const platformStatus = Object.assign({}, content.platformStatus || {});
      const platformPostUrls = Object.assign({}, content.platformPostUrls || {});
      const platformErrors = Object.assign({}, content.platformErrors || {});
      platformStatus[current.platform] = nextStatus;

      if (success && payload && payload.platformPostUrl) platformPostUrls[current.platform] = payload.platformPostUrl;
      if (!success) platformErrors[current.platform] = String(payload && payload.errorDetails || 'Publishing failed.');

      const nextContent = Object.assign({}, content, { platformStatus });
      let global = recomputeGlobalStatus(nextContent);
      if (platformStatus[current.platform] === 'RETRY_PENDING') global = 'QUEUED';

      tx.set(contentReference, {
        platformStatus,
        platformPostUrls,
        platformErrors,
        status: global,
        updatedAt: nowIso(),
      }, { merge: true });
    }

    return Object.assign({}, current, jobUpdate);
  });

  await addEvent(
    result,
    result.status,
    success ? 'POST_CONFIRMED' : 'PUBLISH_FAILED',
    success ? 'AutoSocial confirmed publishing for ' + result.platform + '.' : result.errorMessage,
    100,
    success ? 'success' : 'error'
  );

  return result;
}

app.post('/api/worker/jobs/:jobId/finish', authenticateWorker, async function (req, res) {
  if (!requireDb(res)) return;

  try {
    const workerId = String(req.body && req.body.workerId || req.workerId);
    const job = await finalizeJob(req.params.jobId, workerId, true, req.body || {});
    res.json({ success: true, job });
  } catch (error) {
    res.status(409).json({ success: false, error: error.message });
  }
});

app.post('/api/worker/jobs/:jobId/fail', authenticateWorker, async function (req, res) {
  if (!requireDb(res)) return;

  try {
    const workerId = String(req.body && req.body.workerId || req.workerId);
    const job = await finalizeJob(req.params.jobId, workerId, false, req.body || {});
    res.json({ success: true, job });
  } catch (error) {
    res.status(409).json({ success: false, error: error.message });
  }
});

app.use('/api', function (_req, res) {
  res.status(404).json({ ok: false, error: 'API route not found.' });
});

const distDir = path.join(rootDir, 'dist');
app.use(express.static(distDir));
app.get('*', function (_req, res) {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, HOST, function () {
  console.log('[server] listening on http://' + HOST + ':' + PORT);
});
