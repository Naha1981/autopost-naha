import { ContentItem, Platform, PlatformPublishStatus, PublishingEvent, PublishingJob, SocialAccount } from '../../types';
import { AutoSocialAdapter } from './autosocial/AutoSocialAdapter';
import { IPublisherAdapter, PublishResult } from './IPublisherAdapter';
import { MockPublisherAdapter } from './mock/MockPublisherAdapter';

export class PublisherService {
  private static instance: PublisherService;
  
  private mockAdapter: MockPublisherAdapter;
  private autoSocialAdapter: AutoSocialAdapter;
  private activeAdapterType: 'mock' | 'autosocial' = 'mock';

  private constructor() {
    this.mockAdapter = new MockPublisherAdapter();
    this.autoSocialAdapter = new AutoSocialAdapter();
  }

  static getInstance(): PublisherService {
    if (!PublisherService.instance) {
      PublisherService.instance = new PublisherService();
    }
    return PublisherService.instance;
  }

  getActiveAdapter(): IPublisherAdapter {
    return this.activeAdapterType === 'mock' ? this.mockAdapter : this.autoSocialAdapter;
  }

  getMockAdapter(): MockPublisherAdapter {
    return this.mockAdapter;
  }

  getAutoSocialAdapter(): AutoSocialAdapter {
    return this.autoSocialAdapter;
  }

  getAdapterType(): 'mock' | 'autosocial' {
    return this.activeAdapterType;
  }

  setAdapterType(type: 'mock' | 'autosocial') {
    this.activeAdapterType = type;
  }

  async publishPlatformJob(
    job: PublishingJob,
    content: ContentItem,
    onProgress?: (event: Omit<PublishingEvent, 'id'>) => void
  ): Promise<PublishResult> {
    const adapter = this.getActiveAdapter();
    return await adapter.publishJob(job, content, onProgress);
  }

  async verifyAccount(account: SocialAccount) {
    return await this.getActiveAdapter().verifyAccount(account);
  }

  async getTelemetry() {
    return await this.getActiveAdapter().getWorkerTelemetry();
  }
}

export const publisherService = PublisherService.getInstance();
