# NahaLabs Social Command Center - Security & Compliance Architecture

## 1. Zero-Trust Local Social Credentials Model

Traditional social publishing systems often request user credentials or long-lived master tokens that expose corporate accounts to catastrophic cloud breaches. NahaLabs rejects this paradigm in favor of an air-gapped local worker boundary.

### Guarantees
1. **Zero Password Storage**: Neither NahaLabs Cloud nor Firestore databases store passwords, 2FA backup codes, or master account secrets.
2. **Local Session Isolation**: All Playwright browser context directories (`.profiles/`) and cookies are stored solely on the operator's local Windows NVMe/SSD.
3. **No Inbound Open Ports**: The local machine acts strictly as an outbound HTTPS client. No webhooks require opening ports (such as port 3000 or 8080) through the operator's NAT or firewall.
4. **Adapter Sandboxing**: Worker communication uses cryptographically signed job payloads and dedicated machine tokens with least privilege.

---

## 2. Cloud Firestore Security Rules

Cloud Firestore security rules enforce strict organizational tenant boundaries:
- Users can only read and write data belonging to their assigned `organizationId`.
- Local workers authenticate via dedicated machine keys validated via cloud endpoints or role claims.
- The public web tier cannot read private system directories.

---

## 3. Media Asset Security

- Media uploaded by NahaLabs operators is stored behind an authenticated abstraction (`MediaStorageService`).
- Temporary signed read URLs with limited TTLs (e.g. 15 minutes) are issued only when a worker claims an active job.
- Once published, local temporary media staged in AutoSocial queues are rotated and cleared to preserve local disk privacy.

---

## 4. Pre-Deployment Security Checklist

- [x] No social passwords accepted in web forms or API endpoints.
- [x] No browser cookies, session strings, or `.profiles` uploaded to cloud storage or Firestore.
- [x] AutoSocial local dashboard (`localhost:3000` / `localhost:8080`) is not exposed to public ingress.
- [x] All environment variables and secrets are kept in `.env.example` and never hardcoded in client source.
- [x] Independent per-platform job state prevents cascade failures.
