import { ContentItem, Platform, PublishingEvent, PublishingJob, SocialAccount } from '../../types';

export interface PublishResult {
  success: boolean;
  platform: Platform;
  postUrl?: string;
  errorMessage?: string;
  durationMs?: number;
}

export interface IPublisherAdapter {
  readonly id: string;
  readonly name: string;
  readonly type: 'mock' | 'autosocial' | 'official';
  
  isAvailable(): Promise<boolean>;

  publishJob(
    job: PublishingJob,
    content: ContentItem,
    onProgress?: (event: Omit<PublishingEvent, 'id'>) => void
  ): Promise<PublishResult>;

  cancelJob(jobId: string): Promise<boolean>;

  verifyAccount(account: SocialAccount): Promise<{
    connected: boolean;
    status: 'CONNECTED' | 'DISCONNECTED' | 'NEEDS_REAUTH' | 'PENDING_LOCAL_SETUP';
    message: string;
  }>;

  getWorkerTelemetry(): Promise<{
    status: 'ONLINE' | 'STANDBY' | 'SIMULATED' | 'OFFLINE';
    workerId: string;
    machineName: string;
    autoSocialPath?: string;
    lastPing: string;
  }>;
}
