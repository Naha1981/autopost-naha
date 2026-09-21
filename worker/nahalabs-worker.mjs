
/**
 * NahaLabs Local Publishing Worker
 *
 * Runs on the private Windows operator machine.
 * It polls the NahaLabs cloud queue over HTTPS and hands approved jobs
 * to the existing local AutoSocial installation.
 */

import 'dotenv/config';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const knownAccountHandles = new Map();

const CONFIG = {
  cloudUrl: process.env.NAHALABS_CLOUD_URL || '',
  workerToken: process.env.WORKER_TOKEN || '',
  organizationId: process.env.WORKER_ORGANIZATION_ID || 'org_nahalabs_hq',
  workerId: process.env.WORKER_ID || 'worker-' + os.hostname(),
  workerVersion: process.env.WORKER_VERSION || '1.0.0',
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 5000),
  heartbeatIntervalMs: Number(process.env.HEARTBEAT_INTERVAL_MS || 15000),
  autoSocialUrl: process.env.AUTOSOCIAL_URL || 'http://127.0.0.1:3000',
  autoSocialPath: process.env.AUTOSOCIAL_PATH || 'C:\\Users\\Thabiso\\AutoSocial',
  autoSocialSchedulerEnabled: String(process.env.AUTOSOCIAL_SCHEDULER_ENABLED || 'false').toLowerCase() === 'true',
};

const RUN_ENDPOINTS = {
  tiktok: '/api/run-once',
  instagram: '/api/instagram/run-once',
  youtube: '/api/youtube/run-once',
};

const STOP_ENDPOINTS = {
  tiktok: '/api/stop',
  instagram: '/api/instagram/stop',
  youtube: '/api/youtube/stop',
};

const LOGIN_ENDPOINTS = {
  tiktok: '/api/tiktok/login',
  instagram: '/api/instagram/login',
  youtube: '/api/youtube/login',
};

function requireToken() {
  if (!CONFIG.cloudUrl) throw new Error('NAHALABS_CLOUD_URL is required in worker/.env.');
  if (!CONFIG.workerToken) throw new Error('WORKER_TOKEN is required in worker/.env.');

  const parsed = new URL(CONFIG.cloudUrl);
  const localHost = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
  if (!localHost && parsed.protocol !== 'https:') {
    throw new Error('NAHALABS_CLOUD_URL must use HTTPS unless it points to localhost.');
  }
}

async function requestJson(baseUrl, route, options) {
  const opts = options || {};
  const headers = Object.assign({ Accept: 'application/json' }, opts.headers || {});
  if (opts.body !== undefined && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const response = await fetch(new URL(route, baseUrl), Object.assign({}, opts, { headers }));
  const text = await response.text();

  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok) throw new Error(body.error || body.message || 'HTTP ' + response.status);
  return body;
}

function cloudHeaders() {
  return {
    Authorization: 'Bearer ' + CONFIG.workerToken,
    'X-Worker-Id': CONFIG.workerId,
  };
}

function cloudGet(route) {
  return requestJson(CONFIG.cloudUrl, route, { method: 'GET', headers: cloudHeaders() });
}

function cloudPost(route, body) {
  return requestJson(CONFIG.cloudUrl, route, {
    method: 'POST',
    headers: cloudHeaders(),
    body: JSON.stringify(body || {}),
  });
}

function autoGet(route) {
  return requestJson(CONFIG.autoSocialUrl, route, { method: 'GET' });
}

function autoPost(route, body) {
  return requestJson(CONFIG.autoSocialUrl, route, {
    method: 'POST',
    body: JSON.stringify(body || {}),
  });
}

async function ensureAutoSocialAccount(handle) {
  const clean = String(handle || '').replace(/^@/, '').trim();
  if (!clean) throw new Error('Missing AutoSocial account handle.');

  const state = await autoGet('/api/accounts');
  const accounts = Array.isArray(state.accounts) ? state.accounts : [];
  let account = accounts.find(function (item) {
    return item.id === clean || item.name === clean || item.name === handle;
  });

  if (!account) {
    const created = await autoPost('/api/accounts/add', { name: clean });
    account = created.account;
  }

  await autoPost('/api/accounts/select', { accountId: account.id });
  knownAccountHandles.set(account.id, handle.startsWith('@') ? handle : '@' + handle);
  return account;
}

function getQueueDirs(accountId, platform) {
  const base = path.join(CONFIG.autoSocialPath, 'queue', accountId, platform);
  return {
    pending: path.join(base, 'pending'),
    posted: path.join(base, 'posted'),
    failed: path.join(base, 'failed'),
  };
}

async function ensureQueueDirs(dirs) {
  await Promise.all([dirs.pending, dirs.posted, dirs.failed].map(function (dir) {
    return fsPromises.mkdir(dir, { recursive: true });
  }));
}

async function hasSavedSession(accountId, platform) {
  const profile = path.join(CONFIG.autoSocialPath, '.profiles', accountId, platform);
  const candidates = [
    path.join(profile, 'Default', 'Cookies'),
    path.join(profile, 'Cookies'),
    path.join(profile, 'Network', 'Cookies'),
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fsPromises.stat(candidate);
      if (stat.isFile() && stat.size > 0) return true;
    } catch {}
  }
  return false;
}

async function heartbeat(status, activeJobsCount) {
  const state = await autoGet('/api/accounts');
  const accounts = Array.isArray(state.accounts) ? state.accounts : [];
  const reported = [];

  for (const account of accounts) {
    for (const platform of ['instagram', 'tiktok', 'youtube']) {
      reported.push({
        platform,
        handle: knownAccountHandles.get(account.id) || '@' + account.id,
        connected: await hasSavedSession(account.id, platform),
      });
    }
  }

  return cloudPost('/api/worker/heartbeat', {
    workerId: CONFIG.workerId,
    organizationId: CONFIG.organizationId,
    machineName: os.hostname(),
    version: CONFIG.workerVersion,
    status: status || 'ONLINE',
    activeJobsCount: activeJobsCount || 0,
    installedPlatforms: ['instagram', 'tiktok', 'youtube'],
    autoSocialPath: CONFIG.autoSocialPath,
    accounts: reported,
  });
}

function emit(jobId, data) {
  return cloudPost('/api/worker/jobs/' + jobId + '/events', Object.assign({ workerId: CONFIG.workerId }, data));
}

function claim(jobId) {
  return cloudPost('/api/worker/jobs/' + jobId + '/claim', {
    workerId: CONFIG.workerId,
    machineName: os.hostname(),
  });
}

function finish(jobId, data) {
  return cloudPost('/api/worker/jobs/' + jobId + '/finish', Object.assign({ workerId: CONFIG.workerId }, data));
}

function fail(jobId, data) {
  return cloudPost('/api/worker/jobs/' + jobId + '/fail', Object.assign({ workerId: CONFIG.workerId }, data));
}

async function pendingVideos(dir) {
  const extensions = new Set(['.mp4', '.mov', '.webm', '.avi', '.mkv']);
  const entries = await fsPromises.readdir(dir, { withFileTypes: true });
  return entries
    .filter(function (entry) {
      return entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase());
    })
    .map(function (entry) {
      return path.join(dir, entry.name);
    });
}

async function downloadMedia(url, target) {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error('Media download failed with HTTP ' + response.status + '.');

  const temp = target + '.download';
  await fsPromises.mkdir(path.dirname(target), { recursive: true });
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(temp));
  await fsPromises.rename(temp, target);
}

async function stage(job) {
  const account = await ensureAutoSocialAccount(job.accountHandle);
  const dirs = getQueueDirs(account.id, job.platform);
  await ensureQueueDirs(dirs);

  const pending = await pendingVideos(dirs.pending);
  if (pending.length > 0) {
    throw new Error('AutoSocial pending queue is not empty for ' + account.id + '/' + job.platform + '. Refusing to run another job.');
  }

  const spoolDir = path.join(CONFIG.autoSocialPath, '.nahalabs-worker', 'spool');
  await fsPromises.mkdir(spoolDir, { recursive: true });

  const spoolFile = path.join(spoolDir, job.jobId + '.mp4');
  const targetFile = path.join(dirs.pending, job.jobId + '.mp4');
  const captionFile = path.join(dirs.pending, job.jobId + '.description');
  const metadataFile = path.join(dirs.pending, job.jobId + '.nahalabs.json');

  await emit(job.jobId, {
    status: 'CLAIMED',
    step: 'MEDIA_DOWNLOAD',
    message: 'Downloading media to local temporary storage.',
    progressPct: 20,
    level: 'info',
  });

  await downloadMedia(job.mediaDownloadUrl || job.videoUrl, spoolFile);
  await fsPromises.rename(spoolFile, targetFile);
  await fsPromises.writeFile(captionFile, String(job.caption || ''), 'utf8');
  await fsPromises.writeFile(metadataFile, JSON.stringify({
    jobId: job.jobId,
    contentId: job.contentId,
    brandId: job.brandId,
    platform: job.platform,
    accountHandle: job.accountHandle,
    title: job.title,
    scheduledAt: job.scheduledAt || null,
    stagedAt: new Date().toISOString(),
  }, null, 2), 'utf8');

  await emit(job.jobId, {
    status: 'STAGED',
    step: 'AUTOSOCIAL_STAGE',
    message: 'Staged the exact NahaLabs job into AutoSocial pending.',
    progressPct: 40,
    level: 'info',
  });

  return { accountId: account.id, targetFile, captionFile, metadataFile, spoolFile };
}

async function stopAutoSocialScheduler(platform) {
  if (CONFIG.autoSocialSchedulerEnabled) return;
  await autoPost(STOP_ENDPOINTS[platform], {});
}

async function execute(job, staged) {
  await stopAutoSocialScheduler(job.platform);
  await ensureAutoSocialAccount(job.accountHandle);

  await emit(job.jobId, {
    status: 'PUBLISHING',
    step: 'AUTOSOCIAL_RUN_ONCE',
    message: 'Starting the existing AutoSocial publisher.',
    progressPct: 60,
    level: 'info',
  });

  const result = await autoPost(RUN_ENDPOINTS[job.platform], {});
  if (result.skipped) throw new Error(result.reason || 'AutoSocial skipped the job.');
  if (!result.ok) throw new Error(result.error || 'AutoSocial reported a publishing failure.');

  const expectedName = job.jobId + '.mp4';
  const movedVideo = String(result.movedVideo || '');
  if (movedVideo && !movedVideo.endsWith(expectedName)) {
    throw new Error('Safety check failed: AutoSocial moved ' + movedVideo + ' instead of ' + expectedName + '.');
  }

  await emit(job.jobId, {
    status: 'PUBLISHING',
    step: 'POST_VERIFIED',
    message: 'AutoSocial reported success and moved the exact staged job.',
    progressPct: 95,
    level: 'info',
  });

  return { postUrl: result.postUrl || null };
}

async function cleanupStage(staged) {
  if (!staged) return;
  await Promise.all([
    staged.targetFile,
    staged.captionFile,
    staged.metadataFile,
    staged.spoolFile,
  ].map(function (target) {
    return fsPromises.rm(target, { force: true }).catch(function () {});
  }));
}

async function processJob(job) {
  const claimResult = await claim(job.jobId);
  const claimed = Object.assign({}, job, claimResult.job || {});
  let staged = null;

  try {
    staged = await stage(claimed);
    const result = await execute(claimed, staged);

    await finish(job.jobId, {
      status: 'PUBLISHED',
      platformPostUrl: result.postUrl,
    });

    return true;
  } catch (error) {
    console.error('[job ' + job.jobId + '] ' + error.message);
    await cleanupStage(staged);

    await fail(job.jobId, {
      status: 'FAILED',
      errorDetails: error.message,
    }).catch(function (reportError) {
      console.error('[job ' + job.jobId + '] failure reporting failed: ' + reportError.message);
    });

    return false;
  } finally {
    if (staged && staged.spoolFile) await fsPromises.rm(staged.spoolFile, { force: true }).catch(function () {});
  }
}

async function pollOnce() {
  const result = await cloudGet('/api/worker/jobs/poll?limit=1');
  if (!result.jobs || !result.jobs.length) return false;
  return processJob(result.jobs[0]);
}

async function startLoop() {
  requireToken();

  let stopping = false;
  process.on('SIGINT', function () { stopping = true; });
  process.on('SIGTERM', function () { stopping = true; });

  console.log('NahaLabs Worker started.');
  console.log('Cloud: ' + CONFIG.cloudUrl);
  console.log('AutoSocial: ' + CONFIG.autoSocialUrl);
  console.log('AutoSocial path: ' + CONFIG.autoSocialPath);
  console.log('Worker ID: ' + CONFIG.workerId);

  await heartbeat('ONLINE', 0);
  let lastHeartbeat = Date.now();

  while (!stopping) {
    try {
      const active = await pollOnce();

      if (Date.now() - lastHeartbeat >= CONFIG.heartbeatIntervalMs) {
        await heartbeat(active ? 'BUSY' : 'ONLINE', active ? 1 : 0);
        lastHeartbeat = Date.now();
      }

      if (!active) {
        await new Promise(function (resolve) {
          setTimeout(resolve, CONFIG.pollIntervalMs);
        });
      }
    } catch (error) {
      console.error('[worker] ' + error.message);
      await heartbeat('ONLINE', 0).catch(function () {});

      await new Promise(function (resolve) {
        setTimeout(resolve, CONFIG.pollIntervalMs);
      });
    }
  }

  await heartbeat('OFFLINE', 0).catch(function () {});
}

async function login(platform, handle) {
  requireToken();
  await ensureAutoSocialAccount(handle);
  console.log(JSON.stringify(await autoPost(LOGIN_ENDPOINTS[platform], {}), null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'start') {
    await startLoop();
    return;
  }

  if (command === 'test-connection') {
    requireToken();
    const cloud = await cloudGet('/api/worker/jobs/poll?limit=1');
    const local = await autoGet('/api/setup/health');
    console.log(JSON.stringify({
      cloud: { ok: true, jobsVisible: cloud.jobs ? cloud.jobs.length : 0 },
      autosocial: local,
    }, null, 2));
    return;
  }

  if (command === 'login') {
    const accountIndex = args.indexOf('--account');
    const platformIndex = args.indexOf('--platform');
    const handle = accountIndex >= 0 ? args[accountIndex + 1] : '';
    const platform = platformIndex >= 0 ? args[platformIndex + 1] : '';

    if (!handle || !LOGIN_ENDPOINTS[platform]) {
      throw new Error('Usage: node worker/nahalabs-worker.mjs login --account <handle> --platform <instagram|tiktok|youtube>');
    }

    await login(platform, handle);
    return;
  }

  throw new Error('Usage: node worker/nahalabs-worker.mjs <start|test-connection|login>');
}

main().catch(function (error) {
  console.error(error.message);
  process.exitCode = 1;
});
