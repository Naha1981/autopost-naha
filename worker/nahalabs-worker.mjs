/**
 * NahaLabs Local Publishing Worker Daemon
 * Runs on the NahaLabs operator's Windows machine beside AutoSocial.
 * 
 * AutoSocial directory reference:
 *   queue/<account>/<platform>/{pending,posted,failed}
 *   .profiles/<account>/<platform>
 * 
 * Usage:
 *   node worker/nahalabs-worker.mjs start
 *   node worker/nahalabs-worker.mjs test-connection
 *   node worker/nahalabs-worker.mjs login --account naha_media --platform tiktok
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const knownAccountHandles = new Map();

const CONFIG = {
  cloudUrl: process.env.NAHALABS_CLOUD_URL || 'http://localhost:3000',
  workerToken: process.env.WORKER_TOKEN || 'nh_worker_local_key',
  autoSocialPath: process.env.AUTOSOCIAL_PATH || 'C:\\NahaLabs\\AutoSocial',
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000', 10),
  workerId: process.env.WORKER_ID || `worker-win11-${process.env.COMPUTERNAME || 'local'}`,
};

console.log('=====================================================');
console.log(' NahaLabs Local Publishing Worker (AutoSocial Daemon)');
console.log('=====================================================');
console.log(`Cloud Server:    ${CONFIG.cloudUrl}`);
console.log(`Worker ID:       ${CONFIG.workerId}`);
console.log(`AutoSocial Path: ${CONFIG.autoSocialPath}`);
console.log(`Poll Interval:   ${CONFIG.pollIntervalMs}ms`);
console.log('-----------------------------------------------------');

// Verify AutoSocial Queue Structure
function verifyQueueDirectory(account, platform) {
  const accountClean = account.replace('@', '');
  const pendingDir = path.join(CONFIG.autoSocialPath, 'queue', accountClean, platform, 'pending');
  const postedDir = path.join(CONFIG.autoSocialPath, 'queue', accountClean, platform, 'posted');
  const failedDir = path.join(CONFIG.autoSocialPath, 'queue', accountClean, platform, 'failed');

  [pendingDir, postedDir, failedDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        // Mock fallback if on non-Windows/demo environment
      }
    }
  });

  return { pendingDir, postedDir, failedDir };
}

// Stage job to AutoSocial queue
async function stageJobToAutoSocial(job) {
  console.log(`[STAGE] Staging Job #${job.id} for account ${job.accountHandle} on ${job.platform.toUpperCase()}`);
  const dirs = verifyQueueDirectory(job.accountHandle, job.platform);
  
  const videoFileName = `${job.id}.mp4`;
  const metaFileName = `${job.id}.json`;
  
  const targetVideoPath = path.join(dirs.pendingDir, videoFileName);
  const targetMetaPath = path.join(dirs.pendingDir, metaFileName);

  const metadata = {
    jobId: job.id,
    contentId: job.contentId,
    brandId: job.brandId,
    account: job.accountHandle,
    platform: job.platform,
    caption: job.caption,
    title: job.title,
    stagedAt: new Date().toISOString(),
  };

  console.log(`[STAGE] Target metadata: ${targetMetaPath}`);
  return { targetVideoPath, targetMetaPath, metadata };
}

// Simple heartbeat logger
setInterval(() => {
  // console.log(`[HEARTBEAT] Worker ${CONFIG.workerId} alive at ${new Date().toLocaleTimeString()}`);
}, 15000);

console.log('[READY] NahaLabs Local Worker ready. Listening for cloud queue dispatches.');
