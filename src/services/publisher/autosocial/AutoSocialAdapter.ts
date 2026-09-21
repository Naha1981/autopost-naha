import { ContentItem, Platform, PublishingEvent, PublishingJob, SocialAccount } from '../../../types';
import { IPublisherAdapter, PublishResult } from '../IPublisherAdapter';

export interface AutoSocialAdapterConfig {
  workerApiBaseUrl?: string;
  workerApiKey?: string;
  autoSocialRootPath?: string;
}

export class AutoSocialAdapter implements IPublisherAdapter {
  readonly id = 'adapter-autosocial-local-worker';
  readonly name = 'AutoSocial Windows Worker';
  readonly type = 'autosocial' as const;

  constructor(_config?: Partial<AutoSocialAdapterConfig>) {}
  updateConfig(_newConfig: Partial<AutoSocialAdapterConfig>) {}

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async publishJob(job: PublishingJob, _content: ContentItem, _onProgress?: (event: Omit<PublishingEvent, 'id'>) => void): Promise<PublishResult> {
    return {
      success: false,
      platform: job.platform,
      errorMessage: 'Browser execution is disabled. AutoSocial publishing is owned by the local NahaLabs Worker.',
      durationMs: 0,
    };
  }

  async cancelJob(_jobId: string): Promise<boolean> {
    return false;
  }

  async verifyAccount(account: SocialAccount): Promise<{
    connected: boolean;
    status: 'CONNECTED' | 'DISCONNECTED' | 'NEEDS_REAUTH' | 'PENDING_LOCAL_SETUP';
    message: string;
  }> {
    return {
      connected: account.connectionStatus === 'CONNECTED',
      status: account.connectionStatus,
      message: 'Session verification is local-only. The Windows Worker heartbeat updates account state; social passwords and browser profiles never enter the cloud.',
    };
  }

  async getWorkerTelemetry() {
    return {
      status: 'OFFLINE' as const,
      workerId: 'worker-local',
      machineName: 'Local Windows Worker',
      lastPing: new Date().toISOString(),
    };
  }
}