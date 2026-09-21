import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const WORKER_SECRET = String(process.env.WORKER_API_SECRET || '').trim();
const ORGANIZATION_ID = String(process.env.WORKER_ORGANIZATION_ID || 'org_nahalabs_hq').trim();
const LEASE_MS = Number(process.env.WORKER_LEASE_MS || 15 * 60 * 1000);
const MAX_RETRIES = Number(process.env.DEFAULT_MAX_RETRIES || 3);
const FIRESTORE_DATABASE_ID = String(process.env.FIRESTORE_DATABASE_ID || 'ai-studio-b5e55ab5-11bb-454a-b0c3-2107e473122c');

const firebaseCredential = process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
  ? cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  : applicationDefault();

const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: firebaseCredential,
      projectId: process.env.FIREBASE_PROJECT_ID || 'flavourly-27292',
    });

const db = getFirestore(firebaseApp, FIRESTORE_DATABASE_ID);
const bucket = getStorage(firebaseApp).bucket();
const app = express();
app.use(express.json({ limit: '2mb' }));

const nowIso = () => new Date().toISOString();

function timingSafeEqualText(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireWorker(req, res, next) {
  if (!WORKER_SECRET) return res.status(503).json({ ok:false, error:'WORKER_API_SECRET is not configured on the server.' });
  const header = String(req.get('authorization') || '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!timingSafeEqualText(token, WORKER_SECRET)) return res.status(401).json({ ok:false, error:'Invalid worker credentials.' });
  return next();
}

function validWorkerId(value) {
  const workerId = String(value || '').trim();
  if (!workerId || workerId.length > 120) throw new Error('workerId is required.');
  return workerId;
}

function isDue(value) {
  if (!value) return true;
  const time = Date.parse(value);
  return Number.isNaN(time) || time <= Date.now();
}

const EVENT_STATUSES = new Set(['CLAIMED','STAGED','PUBLISHING','PUBLISHED']);
const EVENT_LEVELS = new Set(['info','warn','error','success']);

function calculateGlobalStatus(platformStatus, activePlatforms, currentStatus) {
  const statuses = activePlatforms.map(platform => platformStatus[platform]);
  if (!statuses.length) return currentStatus || 'DRAFT';
  if (statuses.every(status => status === 'PUBLISHED')) return 'PUBLISHED';
  if (statuses.some(status => status === 'RETRY_PENDING')) return 'RETRY_PENDING';
  if (statuses.some(status => ['CLAIMED','STAGED','PUBLISHING'].includes(status))) return 'PUBLISHING';
  if (statuses.some(status => status === 'QUEUED')) return 'QUEUED';
  if (statuses.every(status => status === 'FAILED_PERMANENT')) return 'FAILED_PERMANENT';
  if (statuses.every(status => ['FAILED','FAILED_PERMANENT'].includes(status))) return 'FAILED';
  if (statuses.some(status => status === 'PUBLISHED')) return 'PARTIAL';
  return currentStatus || 'DRAFT';
}

async function getJob(jobId) {
  const snapshot = await db.collection('publishing_jobs').doc(jobId).get();
  if (!snapshot.exists) throw new Error('Publishing job not found.');
  const job = snapshot.data();
  if (job.organizationId !== ORGANIZATION_ID) throw new Error('Job does not belong to this worker organization.');
  return { ref:snapshot.ref, data:job };
}

async function getContent(contentId) {
  const snapshot = await db.collection('content').doc(contentId).get();
  if (!snapshot.exists) throw new Error('Content item not found.');
  const content = snapshot.data();
  if (content.organizationId !== ORGANIZATION_ID) throw new Error('Content does not belong to this worker organization.');
  return { ref:snapshot.ref, data:content };
}

async function recoverExpiredJobs() {
  const now = Date.now();
  for (const currentJobStatus of ['CLAIMED','STAGED','PUBLISHING']) {
    const snapshot = await db.collection('publishing_jobs')
      .where('organizationId','==',ORGANIZATION_ID)
      .where('status','==',currentJobStatus)
      .limit(25)
      .get();

    for (const item of snapshot.docs) {
      const job = item.data();
      if (!job.leaseExpiresAt || Date.parse(job.leaseExpiresAt) > now) continue;

      const nextRetryCount = Number(job.retryCount || 0) + 1;
      const terminal = nextRetryCount >= MAX_RETRIES;
      const contentRef = db.collection('content').doc(job.contentId);
      const contentSnapshot = await contentRef.get();
      const timestamp = nowIso();
      const nextStatus = terminal ? 'FAILED_PERMANENT' : 'RETRY_PENDING';
      const errorMessage = 'Worker lease expired before completion. The job was recovered by the control plane.';

      if (contentSnapshot.exists) {
        const content = contentSnapshot.data();
        const platformStatus = { ...(content.platformStatus || {}), [job.platform]: nextStatus };
        await db.runTransaction(async transaction => {
          transaction.update(item.ref,{
            status:nextStatus,
            retryCount:nextRetryCount,
            errorMessage,
            failedAt:timestamp,
            readyAt:terminal ? null : new Date(Date.now()+15000).toISOString(),
            leaseExpiresAt:null,
            updatedAt:timestamp
          });
          transaction.update(contentRef,{
            platformStatus,
            platformErrors:{...(content.platformErrors || {}),[job.platform]:errorMessage},
            status:calculateGlobalStatus(platformStatus,content.platforms || [job.platform],nextStatus),
            updatedAt:timestamp
          });
        });
      } else {
        await item.ref.update({
          status:nextStatus,
          retryCount:nextRetryCount,
          errorMessage,
          failedAt:timestamp,
          readyAt:terminal ? null : new Date(Date.now()+15000).toISOString(),
          leaseExpiresAt:null,
          updatedAt:timestamp
        });
      }
    }
  }
}

async function enrichContentForWorker(content) {
  if (!content?.mediaStorageKey) return content;
  try {
    const file = bucket.file(content.mediaStorageKey);
    const signed = await file.getSignedUrl({
      version:'v4',
      action:'read',
      expires:Date.now() + 15 * 60 * 1000,
    });
    return { ...content, workerMediaUrl:signed[0] };
  } catch (error) {
    throw new Error('Could not create a temporary media URL for worker download: '+error.message);
  }
}

async function findNextClaimableJob() {
  const candidates = [];
  for (const status of ['QUEUED','RETRY_PENDING']) {
    const snapshot = await db.collection('publishing_jobs')
      .where('organizationId','==',ORGANIZATION_ID)
      .where('status','==',status)
      .limit(50)
      .get();

    snapshot.docs.forEach(docSnapshot => {
      const job = docSnapshot.data();
      if (isDue(job.readyAt)) candidates.push({ ref:docSnapshot.ref, data:job });
    });
  }

  candidates.sort((a,b) =>
    String(a.data.readyAt || a.data.createdAt).localeCompare(String(b.data.readyAt || b.data.createdAt))
  );
  return candidates[0] || null;
}

app.get('/api/health',(req,res)=>{
  res.json({
    ok:true,
    service:'nahalabs-social-command-center',
    workerApiConfigured:Boolean(WORKER_SECRET),
    organizationId:ORGANIZATION_ID,
    timestamp:nowIso()
  });
});

app.post('/api/worker/heartbeat',requireWorker,async(req,res)=>{
  try {
    const workerId = validWorkerId(req.body?.workerId);
    const payload = {
      workerId,
      organizationId:ORGANIZATION_ID,
      machineName:String(req.body?.machineName || 'Unknown Windows machine'),
      version:String(req.body?.version || 'unknown'),
      status:req.body?.status === 'BUSY' ? 'BUSY' : 'ONLINE',
      lastSeenAt:nowIso(),
      installedPlatforms:Array.isArray(req.body?.installedPlatforms) ? req.body.installedPlatforms : ['instagram','tiktok','youtube'],
      autoSocialPath:String(req.body?.autoSocialPath || ''),
      autoSocialUrl:String(req.body?.autoSocialUrl || 'http://127.0.0.1:3000'),
      activeJobsCount:Number(req.body?.activeJobsCount || 0)
    };
    await db.collection('worker_heartbeats').doc(workerId).set(payload,{merge:true});
    res.json({ok:true,heartbeat:payload});
  } catch(error) {
    res.status(400).json({ok:false,error:error.message});
  }
});

app.get('/api/worker/jobs/poll',requireWorker,async(req,res)=>{
  try {
    validWorkerId(req.query.workerId);
    await recoverExpiredJobs();
    const next = await findNextClaimableJob();
    if (!next) return res.json({ok:true,job:null});
    const content = await getContent(next.data.contentId);
    const workerContent = await enrichContentForWorker({ id:content.ref.id, ...content.data });
    res.json({
      ok:true,
      job:{id:next.ref.id,...next.data},
      content:workerContent
    });
  } catch(error) {
    res.status(400).json({ok:false,error:error.message});
  }
});

app.post('/api/worker/jobs/:jobId/claim',requireWorker,async(req,res)=>{
  try {
    const workerId = validWorkerId(req.body?.workerId);
    const jobRef = db.collection('publishing_jobs').doc(req.params.jobId);
    let claimedJob = null;

    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(jobRef);
      if (!snapshot.exists) throw new Error('Publishing job not found.');
      const job = snapshot.data();

      if (job.organizationId !== ORGANIZATION_ID) throw new Error('Job does not belong to this worker organization.');
      if (!['QUEUED','RETRY_PENDING'].includes(job.status)) throw new Error('Job is not claimable from ' + job.status + '.');
      if (!isDue(job.readyAt)) throw new Error('Job is not due yet.');

      const timestamp = nowIso();
      const leaseExpiresAt = new Date(Date.now()+LEASE_MS).toISOString();

      claimedJob = {
        id:snapshot.id,
        ...job,
        status:'CLAIMED',
        workerId,
        workerMachineName:String(req.body?.machineName || ''),
        claimedAt:timestamp,
        leaseExpiresAt,
        updatedAt:timestamp
      };

      transaction.update(jobRef,{
        status:'CLAIMED',
        workerId,
        workerMachineName:String(req.body?.machineName || ''),
        claimedAt:timestamp,
        leaseExpiresAt,
        updatedAt:timestamp
      });
    });

    const content = await getContent(claimedJob.contentId);
    res.json({ok:true,job:claimedJob,content:{id:content.ref.id,...content.data}});
  } catch(error) {
    res.status(409).json({ok:false,error:error.message});
  }
});

app.post('/api/worker/jobs/:jobId/events',requireWorker,async(req,res)=>{
  try {
    const workerId = validWorkerId(req.body?.workerId);
    const {ref:jobRef,data:job} = await getJob(req.params.jobId);
    if (job.workerId !== workerId) throw new Error('Worker does not own this job.');

    const eventId = 'evt_'+req.params.jobId+'_'+Date.now().toString(36)+'_'+crypto.randomBytes(3).toString('hex');
    const event = {
      id:eventId,
      organizationId:ORGANIZATION_ID,
      jobId:req.params.jobId,
      contentId:String(req.body?.contentId || job.contentId),
      platform:String(req.body?.platform || job.platform),
      status:EVENT_STATUSES.has(req.body?.status) ? req.body.status : 'CLAIMED',
      step:String(req.body?.step || 'WORKER').slice(0,120),
      message:String(req.body?.message || '').slice(0,2000),
      progressPct:Math.max(0,Math.min(100,Number(req.body?.progressPct || 0))),
      timestamp:nowIso(),
      level:EVENT_LEVELS.has(req.body?.level) ? req.body.level : 'info'
    };

    const contentRef = db.collection('content').doc(job.contentId);
    await db.runTransaction(async transaction => {
      const contentSnapshot = await transaction.get(contentRef);
      if (!contentSnapshot.exists) throw new Error('Content item not found.');

      const content = contentSnapshot.data();
      if (content.organizationId !== ORGANIZATION_ID) throw new Error('Content does not belong to this worker organization.');

      const platformStatus = { ...(content.platformStatus || {}),[job.platform]:event.status };
      transaction.set(db.collection('publishing_events').doc(eventId),event);
      transaction.update(jobRef,{
        status:event.status,
        leaseExpiresAt:new Date(Date.now()+LEASE_MS).toISOString(),
        updatedAt:nowIso()
      });
      transaction.update(contentRef,{
        platformStatus,
        status:calculateGlobalStatus(platformStatus,content.platforms || [job.platform],content.status),
        updatedAt:nowIso()
      });
    });

    res.json({ok:true,event});
  } catch(error) {
    res.status(400).json({ok:false,error:error.message});
  }
});

app.post('/api/worker/jobs/:jobId/finish',requireWorker,async(req,res)=>{
  try {
    const workerId = validWorkerId(req.body?.workerId);
    const {ref:jobRef,data:job} = await getJob(req.params.jobId);
    if (job.workerId !== workerId) throw new Error('Worker does not own this job.');

    const {ref:contentRef,data:content} = await getContent(job.contentId);
    const timestamp = nowIso();
    const platformStatus = { ...(content.platformStatus || {}),[job.platform]:'PUBLISHED' };
    const platformPostUrls = { ...(content.platformPostUrls || {}) };
    if (req.body?.postUrl) platformPostUrls[job.platform] = req.body.postUrl;

    const eventId = 'evt_'+req.params.jobId+'_published_'+Date.now().toString(36);
    await db.runTransaction(async transaction => {
      transaction.update(jobRef,{
        status:'PUBLISHED',
        postUrl:req.body?.postUrl || null,
        publishedAt:timestamp,
        leaseExpiresAt:null,
        updatedAt:timestamp
      });
      transaction.update(contentRef,{
        platformStatus,
        platformPostUrls,
        status:calculateGlobalStatus(platformStatus,content.platforms || [job.platform],'PUBLISHED'),
        updatedAt:timestamp
      });
      transaction.set(db.collection('publishing_events').doc(eventId),{
        id:eventId,
        organizationId:ORGANIZATION_ID,
        jobId:req.params.jobId,
        contentId:job.contentId,
        platform:job.platform,
        status:'PUBLISHED',
        step:'POST_CONFIRMED',
        message:String(req.body?.message || ('Published successfully to '+job.platform+'.')),
        progressPct:100,
        timestamp,
        level:'success'
      });
    });

    res.json({ok:true,status:'PUBLISHED'});
  } catch(error) {
    res.status(400).json({ok:false,error:error.message});
  }
});

app.post('/api/worker/jobs/:jobId/fail',requireWorker,async(req,res)=>{
  try {
    const workerId = validWorkerId(req.body?.workerId);
    const {ref:jobRef,data:job} = await getJob(req.params.jobId);
    if (job.workerId !== workerId) throw new Error('Worker does not own this job.');

    const {ref:contentRef,data:content} = await getContent(job.contentId);
    const timestamp = nowIso();
    const nextRetryCount = Number(job.retryCount || 0)+1;
    const terminal = nextRetryCount >= MAX_RETRIES;
    const nextStatus = terminal ? 'FAILED_PERMANENT' : 'RETRY_PENDING';
    const nextReadyAt = terminal ? null : new Date(
      Date.now()+Math.min(30*60*1000,10000*Math.pow(2,Math.max(0,nextRetryCount-1)))
    ).toISOString();

    const errorMessage = String(req.body?.errorMessage || 'AutoSocial worker reported an unknown publishing failure.');
    const platformStatus = { ...(content.platformStatus || {}),[job.platform]:nextStatus };
    const failedEventId = 'evt_'+req.params.jobId+'_failed_'+Date.now().toString(36);

    await db.runTransaction(async transaction => {
      transaction.update(jobRef,{
        status:nextStatus,
        retryCount:nextRetryCount,
        errorMessage,
        failedAt:timestamp,
        readyAt:nextReadyAt,
        leaseExpiresAt:null,
        updatedAt:timestamp
      });
      transaction.update(contentRef,{
        platformStatus,
        platformErrors:{...(content.platformErrors || {}),[job.platform]:errorMessage},
        status:calculateGlobalStatus(platformStatus,content.platforms || [job.platform],nextStatus),
        updatedAt:timestamp
      });
      transaction.set(db.collection('publishing_events').doc(failedEventId),{
        id:failedEventId,
        organizationId:ORGANIZATION_ID,
        jobId:req.params.jobId,
        contentId:job.contentId,
        platform:job.platform,
        status:'FAILED',
        step:'WORKER_ERROR',
        message:errorMessage,
        progressPct:Number(req.body?.progressPct || 0),
        timestamp,
        level:'error'
      });
    });

    res.json({ok:true,status:nextStatus,retryCount:nextRetryCount,readyAt:nextReadyAt});
  } catch(error) {
    res.status(400).json({ok:false,error:error.message});
  }
});

const distDir = path.resolve(__dirname,'..','dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*',(req,res,next)=>{
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir,'index.html'));
  });
}

app.use((error,req,res,next)=>{
  console.error(error);
  res.status(500).json({ok:false,error:error.message || 'Internal server error.'});
});

app.listen(PORT,HOST,()=>{
  console.log('NahaLabs Social Command Center server listening on http://'+HOST+':'+PORT);
  console.log('Worker organization: '+ORGANIZATION_ID);
});
