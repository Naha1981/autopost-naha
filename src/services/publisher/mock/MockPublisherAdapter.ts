import { ContentItem, Platform, PublishingEvent, PublishingJob, SocialAccount } from '../../../types';
import { IPublisherAdapter, PublishResult } from '../IPublisherAdapter';

export class MockPublisherAdapter implements IPublisherAdapter {
  readonly id = 'adapter-mock-local';
  readonly name = 'NahaLabs Mock Local Worker';
  readonly type = 'mock' as const;

  private simulatedFailurePlatforms = new Set<Platform>();

  setSimulateFailure(platform: Platform, shouldFail: boolean) {
    if (shouldFail) {
      this.simulatedFailurePlatforms.add(platform);
    } else {
      this.simulatedFailurePlatforms.delete(platform);
    }
  }

  isFailureSimulated(platform: Platform): boolean {
    return this.simulatedFailurePlatforms.has(platform);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async publishJob(
    job: PublishingJob,
    content: ContentItem,
    onProgress?: (event: Omit<PublishingEvent, 'id'>) => void
  ): Promise<PublishResult> {
    const startTime = Date.now();
    const platform = job.platform;

    const emit = (
      status: PublishingJob['status'],
      step: string,
      message: string,
      progressPct: number,
      level: PublishingEvent['level'] = 'info'
    ) => {
      if (onProgress) {
        onProgress({
          jobId: job.id,
          contentId: content.id,
          platform,
          status,
          step,
          message,
          progressPct,
          timestamp: new Date().toISOString(),
          level,
        });
      }
    };

    // Step 1: Claim & Validate
    emit('CLAIMED', 'WORKER_CLAIM', `Local worker claimed job #${job.id.slice(0, 8)} for ${platform.toUpperCase()}`, 10);
    await new Promise((r) => setTimeout(r, 600));

    // Step 2: Download/Verify Media
    emit(
      'CLAIMED',
      'MEDIA_DOWNLOAD',
      `Downloading video to local disk cache (H.264/AAC validation passed)`,
      25
    );
    await new Promise((r) => setTimeout(r, 700));

    // Step 3: Stage to AutoSocial queue
    const queuePath = `C:\\NahaLabs\\AutoSocial\\queue\\${job.accountHandle.replace('@', '')}\\${platform}\\pending\\${job.id}.mp4`;
    emit(
      'STAGED',
      'AUTOSOCIAL_STAGE',
      `Staged payload to local queue: ${queuePath}`,
      40
    );
    await new Promise((r) => setTimeout(r, 600));

    // Step 4: Launch Playwright & Persistent Profile
    const profilePath = `C:\\NahaLabs\\AutoSocial\\.profiles\\${job.accountHandle.replace('@', '')}\\${platform}`;
    emit(
      'PUBLISHING',
      'PLAYWRIGHT_LAUNCH',
      `Launching Chromium session with persistent profile from ${profilePath}`,
      60
    );
    await new Promise((r) => setTimeout(r, 900));

    // Step 5: Automation Upload
    emit(
      'PUBLISHING',
      'FORM_SUBMISSION',
      `Inputting caption (${content.caption.slice(0, 30)}...) and committing upload payload`,
      80
    );
    await new Promise((r) => setTimeout(r, 800));

    // Check if failure is simulated
    if (this.simulatedFailurePlatforms.has(platform)) {
      const errorMsg = `Playwright automation timed out on ${platform.toUpperCase()} upload challenge (Simulated Error for testing)`;
      emit('FAILED', 'PLAYWRIGHT_ERROR', errorMsg, 80, 'error');
      return {
        success: false,
        platform,
        errorMessage: errorMsg,
        durationMs: Date.now() - startTime,
      };
    }

    // Step 6: Verified Post Complete
    const mockPostUrls: Record<Platform, string> = {
      instagram: `https://www.instagram.com/reel/C_${Math.random().toString(36).substring(2, 9)}/`,
      tiktok: `https://www.tiktok.com/@${job.accountHandle.replace('@', '')}/video/7${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      youtube: `https://youtube.com/shorts/${Math.random().toString(36).substring(2, 11)}`,
    };

    const postUrl = mockPostUrls[platform];
    emit(
      'PUBLISHED',
      'POST_CONFIRMED',
      `Published successfully to ${platform.toUpperCase()}! Post link: ${postUrl}`,
      100,
      'success'
    );

    return {
      success: true,
      platform,
      postUrl,
      durationMs: Date.now() - startTime,
    };
  }

  async cancelJob(jobId: string): Promise<boolean> {
    return true;
  }

  async verifyAccount(account: SocialAccount): Promise<{
    connected: boolean;
    status: 'CONNECTED' | 'DISCONNECTED' | 'NEEDS_REAUTH' | 'PENDING_LOCAL_SETUP';
    message: string;
  }> {
    return {
      connected: true,
      status: 'CONNECTED',
      message: `Verified persistent Chromium profile in .profiles/${account.handle.replace('@', '')}/${account.platform}`,
    };
  }

  async getWorkerTelemetry() {
    return {
      status: 'SIMULATED' as const,
      workerId: 'worker-za-jhb-mock',
      machineName: 'WIN11-NAHALABS-SIMULATOR',
      autoSocialPath: 'C:\\NahaLabs\\AutoSocial',
      lastPing: new Date().toISOString(),
    };
  }
}
