# AutoSocial Integration

AutoSocial is treated as a local execution engine. NahaLabs does not call AutoSocial from the browser and does not reimplement its uploaders.

For a claimed job the worker:

1. Resolves the AutoSocial account locally.
2. Stops that platform scheduler temporarily so the wrong queued item cannot win the race.
3. Moves pre-existing pending items into a temporary local hold folder.
4. Downloads the cloud media into the exact AutoSocial account/platform pending queue.
5. Writes the caption beside the video using AutoSocial's existing `.description` convention.
6. Calls the existing platform `run-once` endpoint.
7. Verifies the returned queue item belongs to the NahaLabs job.
8. Restores previously held queue items and restarts the scheduler if it was running.

The existing AutoSocial Playwright profiles remain local.
