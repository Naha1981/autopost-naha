export type Platform = 'instagram' | 'tiktok' | 'youtube';

export type WorkflowStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED';

export type GlobalPublishStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'QUEUED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'PARTIAL'
  | 'FAILED_PERMANENT';

export type PlatformPublishStatus =
  | 'IDLE'
  | 'QUEUED'
  | 'CLAIMED'
  | 'STAGED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'RETRY_PENDING'
  | 'FAILED_PERMANENT';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'operator' | 'client_viewer';
  organizationId: string;
  avatarUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface Brand {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  color: string;
  logoUrl?: string;
  createdAt: string;
  accountsCount?: number;
}

export interface SocialAccount {
  id: string;
  organizationId?: string;
  brandId: string;
  platform: Platform;
  handle: string;
  accountName: string;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'NEEDS_REAUTH' | 'PENDING_LOCAL_SETUP';
  localWorkerId?: string;
  lastActivityAt?: string;
  avatarUrl?: string;
  autoSocialQueuePath?: string;
}

export interface ContentItem {
  id: string;
  organizationId?: string;
  brandId: string;
  title: string;
  videoUrl: string;
  mediaStorageKey?: string;
  thumbnailUrl?: string;
  caption: string;
  platforms: Platform[];
  scheduledAt?: string | null;
  workflowStatus?: WorkflowStatus;
  status: GlobalPublishStatus;
  platformStatus: Record<Platform, PlatformPublishStatus>;
  platformPostUrls?: Partial<Record<Platform, string>>;
  platformErrors?: Partial<Record<Platform, string>>;
  createdAt: string;
  updatedAt: string;
  source?: 'manual' | 'csv' | 'sheets';
}

export interface PublishingJob {
  id: string;
  organizationId?: string;
  contentId: string;
  brandId: string;
  platform: Platform;
  accountHandle: string;
  status: PlatformPublishStatus;
  scheduledAt?: string | null;
  workerId?: string;
  workerMachineName?: string;
  claimedAt?: string;
  leaseExpiresAt?: string;
  publishedAt?: string;
  failedAt?: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries?: number;
  postUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublishingEvent {
  id: string;
  organizationId?: string;
  jobId: string;
  contentId: string;
  platform: Platform;
  status: PlatformPublishStatus;
  step: string;
  message: string;
  progressPct?: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

export interface WorkerHeartbeat {
  workerId: string;
  organizationId?: string;
  machineName: string;
  version: string;
  status: 'ONLINE' | 'BUSY' | 'OFFLINE';
  lastSeenAt: string;
  installedPlatforms: Platform[];
  autoSocialPath: string;
  activeJobsCount: number;
  accounts?: Array<{ platform: Platform; handle: string; connected: boolean }>;
}