# NahaLabs Local Worker Setup on Operator Windows Laptop

This directory contains the lightweight worker daemon that runs directly beside your **AutoSocial** installation on your Windows machine.

## Prerequisites
1. **AutoSocial** installed (e.g. at `C:\NahaLabs\AutoSocial`).
2. Node.js 18+ installed.
3. Persistent browser profiles initialized in `.profiles/<account>/<platform>`.

## Running the Worker

```powershell
# Set environment variables
$env:NAHALABS_CLOUD_URL = "https://your-nahalabs-cloud.run.app"
$env:WORKER_TOKEN = "your_generated_worker_token"
$env:AUTOSOCIAL_PATH = "C:\NahaLabs\AutoSocial"

# Start the worker
node nahalabs-worker.mjs start
```

## How AutoSocial Is Invoked
1. The cloud app queues publishing jobs with video download tokens.
2. This worker downloads the video file and writes it to `C:\NahaLabs\AutoSocial\queue\<account>\<platform>\pending\<jobId>.mp4`.
3. It creates the accompanying `<jobId>.json` metadata file containing caption, tags, and schedule info.
4. It calls AutoSocial's internal runner or lets AutoSocial's directory watcher pick it up.
5. It streams live progress back to NahaLabs Cloud.
