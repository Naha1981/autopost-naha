# NahaLabs Social Command Center Architecture

```text
NahaLabs UI
  -> Firebase Auth
  -> Firestore + Firebase Storage
  -> authenticated Worker API
  -> Windows NahaLabs Worker
  -> AutoSocial localhost
  -> Instagram / TikTok / YouTube
```

NahaLabs owns the business workflow, calendar, approvals, queue and reporting. The worker only bridges publishing jobs to the local AutoSocial installation. AutoSocial remains the execution engine and its existing Playwright automation is not duplicated.

The browser never calls localhost for publishing. The Windows worker does that locally.
