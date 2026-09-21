# NahaLabs Local Worker

Private Windows bridge between the NahaLabs cloud queue and the local AutoSocial installation.

```text
NahaLabs cloud
   -> HTTPS poll/claim
Windows Worker
   -> localhost
AutoSocial
   -> Playwright profiles
Social platforms
```

The worker keeps social credentials and browser sessions local. It does not open an inbound port.

## Setup

1. Copy `worker/.env.example` to `worker/.env`.
2. Set the cloud URL and worker secret.
3. Point `AUTOSOCIAL_PATH` at the local AutoSocial folder.
4. Start AutoSocial on `127.0.0.1:3000`.
5. Run `node worker/nahalabs-worker.mjs test-connection`.
6. Run `node worker/nahalabs-worker.mjs start`.

## Account login

```powershell
node worker\\nahalabs-worker.mjs login --account <account-name> --platform instagram
node worker\\nahalabs-worker.mjs login --account <account-name> --platform tiktok
node worker\\nahalabs-worker.mjs login --account <account-name> --platform youtube
```
