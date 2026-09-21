# NahaLabs Local Worker

The local worker is the private bridge between the cloud publishing queue and AutoSocial. It polls the cloud over HTTPS; the cloud never opens an inbound connection to the Windows laptop.

## Install

1. Copy `worker/.env.example` to `worker/.env`.
2. Set `NAHALABS_CLOUD_URL` to the deployed NahaLabs server URL.
3. Set `WORKER_API_SECRET` to the same long random secret configured on the server.
4. Keep `AUTOSOCIAL_URL=http://127.0.0.1:3000`.
5. Set `AUTOSOCIAL_PATH=C:\Users\Thabiso\AutoSocial`.

## Test

```powershell
cd C:\path\to\autopost-naha
node worker\nahalabs-worker.mjs test-connection
```

## Run

```powershell
node worker\nahalabs-worker.mjs start
```

## Social login

Run AutoSocial locally and create/select the account there. Then use:

```powershell
node worker\nahalabs-worker.mjs login --account <account-name> --platform instagram
node worker\nahalabs-worker.mjs login --account <account-name> --platform tiktok
node worker\nahalabs-worker.mjs login --account <account-name> --platform youtube
```

Passwords, cookies and Playwright profiles remain inside AutoSocial on the Windows machine.
