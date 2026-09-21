import { ContentItem, Platform, PublishingEvent, PublishingJob, SocialAccount } from '../../../types';
import { IPublisherAdapter, PublishResult } from '../IPublisherAdapter';

export interface AutoSocialAdapterConfig {
  workerApiBaseUrl: string;
  workerApiKey: string;
  autoSocialRootPath?: string;
}

export class AutoSocialAdapter implements IPublisherAdapter {
  readonly id = 'adapter-autosocial-local-worker';
  readonly name = 'AutoSocial Windows Worker (Local)';
  readonly type = 'autosocial' as const;

  private config: AutoSocialAdapterConfig;

  constructor(config?: Partial<AutoSocialAdapterConfig>) {
    this.config = {
      workerApiBaseUrl: config?.workerApiBaseUrl || 'http://localhost:54321',
      workerApiKey: config?.workerApiKey || 'nh_worker_local_key',
      autoSocialRootPath: config?.autoSocialRootPath || 'C:\\NahaLabs\\AutoSocial',
    };
  }

  updateConfig(newConfig: Partial<AutoSocialAdapterConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.workerApiBaseUrl}/api/health`, {
        headers: { Authorization: `Bearer ${this.config.workerApiKey}` },
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async publishJob(
    job: PublishingJob,
    content: ContentItem,
    onProgress?: (event: Omit<PublishingEvent, 'id'>) => void
  ): Promise<PublishResult> {
    const startTime = Date.now();
    const platform = job.platform;

    try {
      const response = await fetch(`${this.config.workerApiBaseUrl}/api/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.workerApiKey}`,
        },
        body: JSON.stringify({
          jobId: job.id,
          contentId: content.id,
          platform,
          accountHandle: job.accountHandle,
          mediaUrl: content.videoUrl,
          caption: content.caption,
          title: content.title,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `Local worker returned HTTP ${response.status}`);
      }

      const result = await response.json();
      return {
        success: result.success,
        platform,
        postUrl: result.postUrl,
        errorMessage: result.errorMessage,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        platform,
        errorMessage: `AutoSocial Worker connection failed: ${err.message || 'Worker unreachable at ' + this.config.workerApiBaseUrl}`,
        durationMs: Date.now() - startTime,
      };
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.workerApiBaseUrl}/api/jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.config.workerApiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async verifyAccount(account: SocialAccount): Promise<{
    connected: boolean;
    status: 'CONNECTED' | 'DISCONNECTED' | 'NEEDS_REAUTH' | 'PENDING_LOCAL_SETUP';
    message: string;
  }> {
    try {
      const res = await fetch(
        `${this.config.workerApiBaseUrl}/api/accounts/verify?platform=${account.platform}&handle=${encodeURIComponent(account.handle)}`,
        {
          headers: { Authorization: `Bearer ${this.config.workerApiKey}` },
        }
      );
      if (!res.ok) {
        return {
          connected: false,
          status: 'PENDING_LOCAL_SETUP',
          message: 'Local worker reported profile not initialized yet. Launch worker CLI to seed session.',
        };
      }
      const data = await res.json();
      return {
        connected: data.connected,
        status: data.connected ? 'CONNECTED' : 'DISCONNECTED',
        message: data.message || 'Verified persistent browser session profile.',
      };
    } catch (err) {
      return {
        connected: false,
        status: 'PENDING_LOCAL_SETUP',
        message: 'Local worker daemon offline. Run `node worker.mjs` on operator laptop to verify.',
      };
    }
  }

  async getWorkerTelemetry() {
    try {
      const res = await fetch(`${this.config.workerApiBaseUrl}/api/telemetry`, {
        headers: { Authorization: `Bearer ${this.config.workerApiKey}` },
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          status: 'ONLINE' as const,
          workerId: data.workerId || 'worker-win11-live',
          machineName: data.machineName || 'DESKTOP-OPERATOR',
          autoSocialPath: data.autoSocialPath || this.config.autoSocialRootPath,
          lastPing: new Date().toISOString(),
        };
      }
    } catch {}

    return {
      status: 'OFFLINE' as const,
      workerId: 'worker-win11-unreachable',
      machineName: 'DESKTOP-OPERATOR (DISCONNECTED)',
      autoSocialPath: this.config.autoSocialRootPath,
      lastPing: new Date().toISOString(),
    };
  }
}
