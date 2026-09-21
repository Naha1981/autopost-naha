# Security Model

- Worker authentication uses a server-side `WORKER_API_SECRET`. It is never bundled into the browser.
- Social passwords, cookies and Playwright profiles stay in the local AutoSocial installation.
- AutoSocial binds to loopback by default and is not exposed by NahaLabs.
- Videos uploaded in the web app use Firebase Storage under the authenticated user's media path. The worker receives a short-lived signed URL when a publishing job is due.
- Firestore client rules restrict business records to the authenticated user's organization. Worker writes use Firebase Admin on the server.
- The local worker only makes outbound HTTPS requests to the NahaLabs cloud.
