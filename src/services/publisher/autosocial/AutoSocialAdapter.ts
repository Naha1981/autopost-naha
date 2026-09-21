import { ContentItem, Platform, PublishingEvent, PublishingJob, SocialAccount } from '../../../types';
import { IPublisherAdapter, PublishResult } from '../IPublisherAdapter';

/**
 * Compatibility adapter only.
 *
 * Real AutoSocial execution intentionally does not happen in the browser.
 * The Windows NahaLabs Worker owns that boundary and talks to AutoSocial over
 * localhost. This adapter therefore never contains a worker secret or calls
 * localhost from the deployed web app.
 */
export class AutoSocialAdapter implements IPublisherAdapter {
  readonly id = 'adapter-autosocial-cloud-queue';
  readonly name = 'NahaLabs Cloud Queue → Local AutoSocial Worker';
  readonly type = 'autosocial' as const;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async publishJob(
    job: PublishingJob,
    content: ContentItem,
    onProgress?: (event: Omit<PublishingEvent, 'id'>) => void
  ): Promise<PublishResult> {
    onProgress?.({
      jobId: job.id,
      contentId: content.id,
      platform: job.platform,
      status: 'QUEUED',
      step: 'CLOUD_QUEUE',
      message: 'Job is owned by the cloud queue; the local Windows worker will execute AutoSocial.',
      progressPct: 5,
      timestamp: new Date().toISOString(),
      level: 'info',
    });

    return {
      success: false,
      platform: job.platform,
      errorMessage: 'Browser-side AutoSocial execution is disabled. Use the local NahaLabs Worker.',
      durationMs: 0,
    };
  }

  async cancelJob(): Promise<boolean> {
    return false;
  }

  async verifyAccount(account: SocialAccount) {
    return {
      connected: account.connectionStatus === 'CONNECTED',
      status: account.connectionStatus,
      message:
        'Verification is performed by the Windows NahaLabs Worker using the local AutoSocial profile. No browser-to-localhost connection is used.',
    } as const;
  }

  async getWorkerTelemetry() {
    return {
      status: 'STANDBY' as const,
      workerId: 'cloud-queue-worker',
      machineName: 'Windows operator machine',
      autoSocialPath: 'Configured locally on the worker',
      lastPing: new Date().toISOString(),
    };
  }
}