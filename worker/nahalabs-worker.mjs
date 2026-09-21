/**
 * NahaLabs Local Publishing Worker
 * Cloud control plane -> local worker -> AutoSocial -> social platforms.
 *
 * Social passwords, cookies and Playwright profiles remain local.
 */

import 'dotenv/config';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import path from 'node:path';
import os from 'node:os';

const CONFIG={
  cloudUrl:String(process.env.NAHALABS_CLOUD_URL||'').replace(/\/$/,''),
  workerSecret:String(process.env.WORKER_API_SECRET||''),
  autoSocialUrl:String(process.env.AUTOSOCIAL_URL||'http://127.0.0.1:3000').replace(/\/$/,''),
  autoSocialPath:process.env.AUTOSOCIAL_PATH||'C:\\Users\\Thabiso\\AutoSocial',
  pollIntervalMs:Number(process.env.POLL_INTERVAL_MS||5000),
  workerId:process.env.WORKER_ID||'worker-'+os.hostname().replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,50),
  version:'1.0.0'
};

const PLATFORMS=new Set(['instagram','tiktok','youtube']);
const VIDEO_EXTENSIONS=new Set(['.mp4','.mov','.webm','.avi','.mkv']);

const log=message=>console.log('[NahaLabs Worker '+new Date().toISOString()+'] '+message);
const normalizeName=value=>String(value||'').trim().replace(/^@/,'').toLowerCase();
const platformPrefix=platform=>platform==='tiktok'?'/api':'/api/'+platform;

function assertConfig(){
  if(!CONFIG.cloudUrl)throw new Error('NAHALABS_CLOUD_URL is required.');
  if(!CONFIG.workerSecret)throw new Error('WORKER_API_SECRET is required.');
  if(!/^https:\/\//i.test(CONFIG.cloudUrl)&&!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(CONFIG.cloudUrl)){
    throw new Error('NAHALABS_CLOUD_URL must use HTTPS unless it points to localhost.');
  }
}

async function requestJson(url,options={}){
  const response=await fetch(url,{
    ...options,
    headers:{
      Accept:'application/json',
      ...(options.body?{'Content-Type':'application/json'}:{}),
      ...(options.headers||{})
    },
    signal:options.signal||AbortSignal.timeout(30000)
  });
  const text=await response.text();
  let body={};
  try{body=text?JSON.parse(text):{}}catch{body={raw:text}}
  if(!response.ok)throw new Error(body.error||body.message||('HTTP '+response.status));
  return body;
}

async function cloudRequest(pathname,options={}){
  return requestJson(CONFIG.cloudUrl+pathname,{
    ...options,
    headers:{Authorization:'Bearer '+CONFIG.workerSecret,...(options.headers||{})}
  });
}

async function autoSocialRequest(pathname,options={}){
  return requestJson(CONFIG.autoSocialUrl+pathname,options);
}

async function heartbeat(status='ONLINE',activeJobsCount=0){
  return cloudRequest('/api/worker/heartbeat',{
    method:'POST',
    body:JSON.stringify({
      workerId:CONFIG.workerId,
      machineName:os.hostname(),
      version:CONFIG.version,
      status,
      installedPlatforms:[...PLATFORMS],
      autoSocialPath:CONFIG.autoSocialPath,
      autoSocialUrl:CONFIG.autoSocialUrl,
      activeJobsCount
    })
  });
}

function accountMatches(account,requested){
  const wanted=normalizeName(requested);
  return normalizeName(account.id)===wanted||normalizeName(account.name)===wanted;
}

async function resolveAutoSocialAccount(requestedName,preferredId){
  const response=await autoSocialRequest('/api/accounts');
  const accounts=Array.isArray(response.accounts)?response.accounts:[];
  const exactId=preferredId&&accounts.find(account=>account.id===preferredId);
  if(exactId)return exactId;
  const matched=accounts.find(account=>accountMatches(account,requestedName));
  if(!matched){
    throw new Error('AutoSocial account "'+(requestedName||preferredId||'unknown')+'" is not configured locally. Add/login the account in AutoSocial first.');
  }
  return matched;
}

async function selectAutoSocialAccount(accountId){
  return autoSocialRequest('/api/accounts/select',{
    method:'POST',
    body:JSON.stringify({accountId})
  });
}

async function getPlatformStatus(platform){return autoSocialRequest(platformPrefix(platform)+'/status');}
async function stopPlatform(platform){return autoSocialRequest(platformPrefix(platform)+'/stop',{method:'POST',body:JSON.stringify({})});}
async function startPlatform(platform){return autoSocialRequest(platformPrefix(platform)+'/start',{method:'POST',body:JSON.stringify({})});}
async function runPlatformOnce(platform){return autoSocialRequest(platformPrefix(platform)+'/run-once',{method:'POST',body:JSON.stringify({source:'nahalabs-worker'})});}

function getAccountPlatformRoot(accountId,platform){return path.resolve(CONFIG.autoSocialPath,'queue',accountId,platform);}
function getHoldDir(accountId,platform,jobId){return path.join(CONFIG.autoSocialPath,'.nahalabs-hold',accountId,platform,jobId);}

async function ensureQueueDirs(accountId,platform){
  const root=getAccountPlatformRoot(accountId,platform);
  const dirs={
    root,
    pending:path.join(root,'pending'),
    posted:path.join(root,'posted'),
    failed:path.join(root,'failed')
  };
  await Promise.all(Object.values(dirs).map(dir=>fs.mkdir(dir,{recursive:true})));
  return dirs;
}

async function moveFileIfExists(source,targetDir){
  try{
    await fs.mkdir(targetDir,{recursive:true});
    await fs.rename(source,path.join(targetDir,path.basename(source)));
  }catch(error){
    if(error?.code!=='ENOENT')throw error;
  }
}

async function holdExistingQueue(accountId,platform,jobId){
  const dirs=await ensureQueueDirs(accountId,platform);
  const holdDir=getHoldDir(accountId,platform,jobId);
  await fs.mkdir(holdDir,{recursive:true});
  const entries=await fs.readdir(dirs.pending,{withFileTypes:true});

  for(const entry of entries){
    if(!entry.isFile())continue;
    const ext=path.extname(entry.name).toLowerCase();
    const isVideo=VIDEO_EXTENSIONS.has(ext);
    const isCaption=entry.name.endsWith('.description')||entry.name.endsWith('.txt');
    if(!isVideo&&!isCaption)continue;
    await fs.rename(path.join(dirs.pending,entry.name),path.join(holdDir,entry.name));
  }
  return holdDir;
}

async function restoreHeldQueue(holdDir,pendingDir){
  let names=[];
  try{names=await fs.readdir(holdDir)}catch{return}
  for(const name of names)await moveFileIfExists(path.join(holdDir,name),pendingDir);
  await fs.rm(holdDir,{recursive:true,force:true});
}

function extensionFromResponse(response,sourceUrl){
  const contentType=String(response.headers.get('content-type')||'').toLowerCase();
  if(contentType.includes('webm'))return'.webm';
  if(contentType.includes('quicktime'))return'.mov';
  if(contentType.includes('x-msvideo'))return'.avi';
  if(contentType.includes('x-matroska'))return'.mkv';
  const urlExtension=path.extname(new URL(sourceUrl).pathname).toLowerCase();
  return VIDEO_EXTENSIONS.has(urlExtension)?urlExtension:'.mp4';
}

async function downloadMedia(url,targetDir,jobId){
  const response=await fetch(url,{signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw new Error('Media download failed with HTTP '+response.status+'.');
  if(!response.body)throw new Error('Media response did not provide a readable body.');

  const targetPath=path.join(targetDir,jobId+extensionFromResponse(response,url));
  const output=createWriteStream(targetPath);

  try{
    for await(const chunk of response.body){
      if(!output.write(chunk))await once(output,'drain');
    }
  }finally{
    output.end();
    await once(output,'close').catch(()=>{});
  }

  const stat=await fs.stat(targetPath);
  if(!stat.size)throw new Error('Downloaded media file is empty.');
  return targetPath;
}

async function postEvent(job,payload){
  try{
    await cloudRequest('/api/worker/jobs/'+encodeURIComponent(job.id)+'/events',{
      method:'POST',
      body:JSON.stringify({workerId:CONFIG.workerId,contentId:job.contentId,platform:job.platform,...payload})
    });
  }catch(error){
    log('Could not write worker event for '+job.id+': '+error.message);
  }
}

async function finishJob(job,payload){
  return cloudRequest('/api/worker/jobs/'+encodeURIComponent(job.id)+'/finish',{
    method:'POST',
    body:JSON.stringify({workerId:CONFIG.workerId,...payload})
  });
}

async function failJob(job,errorMessage,progressPct=0){
  return cloudRequest('/api/worker/jobs/'+encodeURIComponent(job.id)+'/fail',{
    method:'POST',
    body:JSON.stringify({workerId:CONFIG.workerId,errorMessage,progressPct})
  });
}

async function executeJob(job,content){
  await heartbeat('BUSY',1);
  log('Claimed '+job.id+' for '+job.platform+' / '+(job.accountHandle||'unmapped account')+'.');

  await postEvent(job,{
    status:'CLAIMED',
    step:'WORKER_CLAIM',
    message:'Worker claimed job '+job.id+'.',
    progressPct:10
  });

  let wasRunning=false;
  let dirs=null;
  let holdDir=null;

  try{
    if(!PLATFORMS.has(job.platform))throw new Error('Unsupported platform: '+job.platform);

    const account=await resolveAutoSocialAccount(job.accountHandle,job.autoSocialAccountId);
    await selectAutoSocialAccount(account.id);

    const status=await getPlatformStatus(job.platform);
    if(status.isPosting){
      throw new Error('AutoSocial '+job.platform+' is already publishing another post for account '+account.id+'.');
    }

    wasRunning=Boolean(status.running);
    if(wasRunning)await stopPlatform(job.platform);

    dirs=await ensureQueueDirs(account.id,job.platform);
    holdDir=await holdExistingQueue(account.id,job.platform,job.id);

    await postEvent(job,{
      status:'CLAIMED',
      step:'MEDIA_DOWNLOAD',
      message:'Downloading cloud media to local worker storage.',
      progressPct:25
    });

    if(!content.workerMediaUrl&&!content.videoUrl){
      throw new Error('Content does not contain a media URL.');
    }

    const stagedVideo=await downloadMedia(content.workerMediaUrl||content.videoUrl,dirs.pending,job.id);
    const captionPath=stagedVideo.slice(0,stagedVideo.lastIndexOf('.'))+'.description';
    await fs.writeFile(captionPath,content.caption||'','utf8');

    await postEvent(job,{
      status:'STAGED',
      step:'AUTOSOCIAL_STAGE',
      message:'Staged '+path.basename(stagedVideo)+' in the local AutoSocial queue.',
      progressPct:45
    });

    await postEvent(job,{
      status:'PUBLISHING',
      step:'AUTOSOCIAL_RUN',
      message:'Invoking AutoSocial '+job.platform+' daemon for account '+account.id+'.',
      progressPct:65
    });

    const result=await runPlatformOnce(job.platform);

    if(result.skipped){
      throw new Error(result.reason||'AutoSocial skipped the publishing run.');
    }

    if(!result.ok){
      const archiveFailure=String(result.error||'').includes('Video posted, but could not archive file from queue.');

      if(archiveFailure){
        await postEvent(job,{
          status:'PUBLISHED',
          step:'POST_CONFIRMED_ARCHIVE_WARNING',
          message:'AutoSocial confirms publication but could not archive the local queue file; preventing duplicate retry.',
          progressPct:100,
          level:'warn'
        });
        await finishJob(job,{
          message:'Published successfully; AutoSocial could not archive the local queue file.'
        });
        return;
      }

      throw new Error(result.error||'AutoSocial reported a publishing failure.');
    }

    const movedVideo=String(result.movedVideo||'');
    if(movedVideo&&!movedVideo.includes(job.id)){
      throw new Error(
        'AutoSocial reported a different queue item ('+
        path.basename(movedVideo)+
        ') instead of the expected NahaLabs job '+job.id+'.'
      );
    }

    await postEvent(job,{
      status:'PUBLISHED',
      step:'POST_CONFIRMED',
      message:'AutoSocial completed the publishing run successfully.',
      progressPct:100,
      level:'success'
    });

    await finishJob(job,{
      message:'AutoSocial completed the publishing run successfully.'
    });
  }catch(error){
    const message=error?.message||'Unknown local publishing error.';
    try{
      await postEvent(job,{
        status:'FAILED',
        step:'WORKER_ERROR',
        message,
        progressPct:70,
        level:'error'
      });
      await failJob(job,message,70);
    }catch(reportError){
      log('Could not report failure for '+job.id+': '+reportError.message);
    }
    throw error;
  }finally{
    if(holdDir&&dirs){
      await restoreHeldQueue(holdDir,dirs.pending).catch(error=>{
        log('Could not restore held queue for '+job.id+': '+error.message);
      });
    }

    if(wasRunning){
      try{
        await startPlatform(job.platform);
      }catch(restartError){
        log('AutoSocial '+job.platform+' scheduler could not be restarted: '+restartError.message);
      }
    }

    await heartbeat('ONLINE',0).catch(error=>log('Heartbeat after job '+job.id+' failed: '+error.message));
  }
}
async function claimJob(job){
  return cloudRequest('/api/worker/jobs/'+encodeURIComponent(job.id)+'/claim',{
    method:'POST',
    body:JSON.stringify({workerId:CONFIG.workerId,machineName:os.hostname()})
  });
}

async function pollOnce(){
  const response=await cloudRequest('/api/worker/jobs/poll?workerId='+encodeURIComponent(CONFIG.workerId));
  if(!response.job)return false;
  try{
    const claimed=await claimJob(response.job);
    await executeJob(claimed.job,claimed.content);
  }catch(error){
    log('Job '+response.job.id+' ended with an error: '+error.message);
  }
  return true;
}

async function testConnection(){
  assertConfig();
  const cloud=await heartbeat('ONLINE',0);
  const local=await autoSocialRequest('/api/setup/health');
  console.log(JSON.stringify({cloud,local},null,2));
}

async function loginLocalAccount(accountName,platform){
  if(!PLATFORMS.has(platform))throw new Error('Unsupported platform: '+platform);
  const account=await resolveAutoSocialAccount(accountName);
  await selectAutoSocialAccount(account.id);
  const result=await autoSocialRequest(platformPrefix(platform)+'/login',{method:'POST',body:JSON.stringify({})});
  console.log(JSON.stringify({account,platform,result},null,2));
}

async function startWorker(){
  assertConfig();
  await heartbeat('ONLINE',0);

  log('Started. Cloud='+CONFIG.cloudUrl+'; AutoSocial='+CONFIG.autoSocialUrl+'; path='+CONFIG.autoSocialPath);

  while(true){
    try{
      const didRun=await pollOnce();
      if(!didRun){
        await heartbeat('ONLINE',0);
        await new Promise(resolve=>setTimeout(resolve,CONFIG.pollIntervalMs));
      }
    }catch(error){
      log('Polling error: '+error.message);
      try{await heartbeat('ONLINE',0)}catch(heartbeatError){log('Heartbeat error: '+heartbeatError.message)}
      await new Promise(resolve=>setTimeout(resolve,CONFIG.pollIntervalMs));
    }
  }
}

async function main(){
  const[command,...args]=process.argv.slice(2);

  if(command==='login'){
    const accountIndex=args.indexOf('--account');
    const platformIndex=args.indexOf('--platform');
    await loginLocalAccount(
      accountIndex>=0?args[accountIndex+1]:'',
      platformIndex>=0?args[platformIndex+1]:''
    );
    return;
  }

  if(command==='test-connection'){
    await testConnection();
    return;
  }

  if(command==='once'){
    assertConfig();
    await heartbeat('ONLINE',0);
    await pollOnce();
    return;
  }

  if(command==='start'||!command){
    await startWorker();
    return;
  }

  throw new Error('Unknown command: '+command);
}

main().catch(error=>{
  console.error('[NahaLabs Worker] '+error.message);
  process.exitCode=1;
});
