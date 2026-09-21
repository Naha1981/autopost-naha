import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  INITIAL_ACCOUNTS,
  INITIAL_BRANDS,
  INITIAL_CONTENT,
} from '../data/initialData';
import {
  auth,
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  googleProvider,
  onAuthStateChanged,
  onSnapshot,
  query,
  setDoc,
  signInWithPopup,
  where,
  writeBatch,
  fbSignOut,
} from '../services/firebase';
import { publisherService } from '../services/publisher/PublisherService';
import {
  Brand,
  ContentItem,
  GlobalPublishStatus,
  Platform,
  PlatformPublishStatus,
  PublishingEvent,
  PublishingJob,
  SocialAccount,
  UserProfile,
} from '../types';

interface AppContextType {
  user: UserProfile | null;
  authLoading: boolean;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loginAsDemoOperator: () => void;
  
  brands: Brand[];
  selectedBrandId: string;
  setSelectedBrandId: (id: string) => void;
  createBrand: (brandData: { name: string; code: string; description?: string; color: string }) => Promise<Brand>;
  
  accounts: SocialAccount[];
  addSocialAccount: (accData: Omit<SocialAccount, 'id'>) => Promise<SocialAccount>;
  
  contentList: ContentItem[];
  selectedContentItem: ContentItem | null;
  setSelectedContentItem: (item: ContentItem | null) => void;
  createContent: (
    itemData: {
      brandId: string;
      title: string;
      videoUrl: string;
      caption: string;
      platforms: Platform[];
      scheduledAt?: string | null;
      mediaStorageKey?: string;
    },
    postNow?: boolean
  ) => Promise<ContentItem>;
  updateContent: (id: string, updates: Partial<ContentItem>) => Promise<void>;
  deleteContent: (id: string) => Promise<void>;
  scheduleContent: (id: string, scheduledDate: string) => Promise<void>;
  reviewContent: (id: string) => Promise<void>;
  approveContent: (id: string) => Promise<void>;
  requestContentChanges: (id: string) => Promise<void>;
  publishNow: (contentId: string, specificPlatforms?: Platform[]) => Promise<void>;
  retryPublish: (contentId: string, platform?: Platform) => Promise<void>;
  
  jobs: PublishingJob[];
  events: PublishingEvent[];
  
  publisherMode: 'mock' | 'autosocial';
  setPublisherMode: (mode: 'mock' | 'autosocial') => void;
  isFailureSimulated: (platform: Platform) => boolean;
  toggleSimulatedFailure: (platform: Platform) => void;
  
  importCsvBatch: (rows: Array<{
    brand: string;
    title: string;
    video_url: string;
    caption: string;
    instagram?: boolean;
    tiktok?: boolean;
    youtube?: boolean;
    scheduled_at?: string;
  }>) => Promise<{ imported: number; errors: string[] }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_CONTENT = 'nahalabs_content_v1';
const LOCAL_STORAGE_KEY_BRANDS = 'nahalabs_brands_v1';
const LOCAL_STORAGE_KEY_ACCOUNTS = 'nahalabs_accounts_v1';
const LOCAL_STORAGE_KEY_JOBS = 'nahalabs_jobs_v1';
const LOCAL_STORAGE_KEY_EVENTS = 'nahalabs_events_v1';


const DEFAULT_ORGANIZATION_ID = 'org_nahalabs_hq';

function replaceContentStatus(
  platformStatus: Record<Platform, PlatformPublishStatus>,
  activePlatforms: Platform[]
): GlobalPublishStatus {
  const statuses = activePlatforms.map((platform) => platformStatus[platform]);
  if (!statuses.length) return 'DRAFT';
  if (statuses.every((status) => status === 'PUBLISHED')) return 'PUBLISHED';
  if (statuses.every((status) => status === 'FAILED_PERMANENT')) return 'FAILED_PERMANENT';
  if (statuses.every((status) => status === 'FAILED')) return 'FAILED';
  if (statuses.some((status) => ['PUBLISHING', 'STAGED', 'CLAIMED'].includes(status))) return 'PUBLISHING';
  if (statuses.some((status) => ['QUEUED', 'RETRY_PENDING'].includes(status))) return 'QUEUED';
  if (statuses.some((status) => status === 'PUBLISHED')) return 'PARTIAL';
  return 'DRAFT';
}

function normalizeContent(item: ContentItem): ContentItem {
  return {
    ...item,
    organizationId: item.organizationId || DEFAULT_ORGANIZATION_ID,
    workflowStatus:
      item.workflowStatus ||
      (['SCHEDULED', 'QUEUED', 'PUBLISHING', 'PUBLISHED'].includes(item.status) ? 'APPROVED' : 'DRAFT'),
    platformStatus: {
      instagram: item.platformStatus?.instagram || 'IDLE',
      tiktok: item.platformStatus?.tiktok || 'IDLE',
      youtube: item.platformStatus?.youtube || 'IDLE',
    },
    platformPostUrls: item.platformPostUrls || {},
    platformErrors: item.platformErrors || {},
  };
}

async function migrateLocalWorkspace(orgId: string) {
  const [brands, accounts, content, jobs, events] = await Promise.all([
    getDocs(query(collection(db, 'brands'), where('organizationId', '==', orgId))),
    getDocs(query(collection(db, 'social_accounts'), where('organizationId', '==', orgId))),
    getDocs(query(collection(db, 'content'), where('organizationId', '==', orgId))),
    getDocs(query(collection(db, 'publishing_jobs'), where('organizationId', '==', orgId))),
    getDocs(query(collection(db, 'publishing_events'), where('organizationId', '==', orgId))),
  ]);

  const localBrands = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_BRANDS) || 'null') || INITIAL_BRANDS;
  const localAccounts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_ACCOUNTS) || 'null') || INITIAL_ACCOUNTS;
  const localContent = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_CONTENT) || 'null') || INITIAL_CONTENT;
  const localJobs = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_JOBS) || '[]');
  const localEvents = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_EVENTS) || '[]');
  const batch = writeBatch(db);
  let writes = 0;

  if (brands.empty) for (const item of localBrands) {
    batch.set(doc(db, 'brands', item.id), { ...item, organizationId: orgId }, { merge: true });
    writes += 1;
  }
  if (accounts.empty) for (const item of localAccounts) {
    batch.set(doc(db, 'social_accounts', item.id), { ...item, organizationId: orgId }, { merge: true });
    writes += 1;
  }
  if (content.empty) for (const item of localContent) {
    const normalized = normalizeContent({ ...item, organizationId: orgId });
    if (normalized.videoUrl.startsWith('blob:')) continue;
    batch.set(doc(db, 'content', normalized.id), normalized, { merge: true });
    writes += 1;
  }
  if (jobs.empty) for (const item of localJobs) {
    batch.set(doc(db, 'publishing_jobs', item.id), { ...item, organizationId: orgId, maxRetries: item.maxRetries || 3 }, { merge: true });
    writes += 1;
  }
  if (events.empty) for (const item of localEvents.slice(0, 400)) {
    batch.set(doc(db, 'publishing_events', item.id), { ...item, organizationId: orgId }, { merge: true });
    writes += 1;
  }
  if (writes) await batch.commit();
}

async function updateFirestoreContent(contentId: string, updates: Partial<ContentItem>) {
  await setDoc(doc(db, 'content', contentId), { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
}

async function updateFirestoreJob(job: PublishingJob) {
  await setDoc(doc(db, 'publishing_jobs', job.id), job, { merge: true });
}


export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth state
  const [user, setUser] = useState<UserProfile | null>({
    uid: 'usr_thabiso_naha',
    email: 'naha.thabiso@gmail.com',
    displayName: 'Thabiso Naha',
    role: 'admin',
    organizationId: 'org_nahalabs_hq',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  });
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Core collections state
  const [brands, setBrands] = useState<Brand[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_BRANDS);
    return saved ? JSON.parse(saved) : INITIAL_BRANDS;
  });

  const [selectedBrandId, setSelectedBrandId] = useState<string>('ALL');

  const [accounts, setAccounts] = useState<SocialAccount[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ACCOUNTS);
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [contentList, setContentList] = useState<ContentItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_CONTENT);
    return saved ? JSON.parse(saved) : INITIAL_CONTENT;
  });

  const [selectedContentItem, setSelectedContentItem] = useState<ContentItem | null>(null);

  const [jobs, setJobs] = useState<PublishingJob[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_JOBS);
    return saved ? JSON.parse(saved) : [];
  });

  const [events, setEvents] = useState<PublishingEvent[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_EVENTS);
    return saved ? JSON.parse(saved) : [];
  });

  const [publisherMode, setPublisherModeState] = useState<'mock' | 'autosocial'>('mock');
  const [simulatedFailures, setSimulatedFailures] = useState<Record<Platform, boolean>>({
    instagram: false,
    tiktok: true, // Default simulate TikTok challenge to test retry behavior effortlessly
    youtube: false,
  });

  // Local storage is a demo/offline fallback only. Authenticated workspaces use Firestore.
  useEffect(() => {
    if (auth.currentUser) return;
    localStorage.setItem(LOCAL_STORAGE_KEY_CONTENT, JSON.stringify(contentList));
  }, [contentList]);

  useEffect(() => {
    if (auth.currentUser) return;
    localStorage.setItem(LOCAL_STORAGE_KEY_BRANDS, JSON.stringify(brands));
  }, [brands]);

  useEffect(() => {
    if (auth.currentUser) return;
    localStorage.setItem(LOCAL_STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    if (auth.currentUser) return;
    localStorage.setItem(LOCAL_STORAGE_KEY_JOBS, JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    if (auth.currentUser) return;
    localStorage.setItem(LOCAL_STORAGE_KEY_EVENTS, JSON.stringify(events));
  }, [events]);

  // Firebase Auth is the real cloud identity. The demo operator remains a local fallback.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setAuthLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', fbUser.uid);
        const existing = await getDoc(userRef);
        const current = existing.exists() ? (existing.data() as UserProfile) : null;
        const profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || current?.email || '',
          displayName: fbUser.displayName || current?.displayName || 'NahaLabs Operator',
          role: current?.role || 'admin',
          organizationId: current?.organizationId || DEFAULT_ORGANIZATION_ID,
          avatarUrl: fbUser.photoURL || current?.avatarUrl || undefined,
        };
        await setDoc(userRef, profile, { merge: true });
        await migrateLocalWorkspace(profile.organizationId);
        setUser(profile);
      } catch (error) {
        console.error('Unable to initialize cloud workspace', error);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const cloudSession = () => Boolean(auth.currentUser && user && user.uid !== 'usr_thabiso_naha');

  // Firestore is authoritative for authenticated workspaces.
  useEffect(() => {
    if (!cloudSession() || !user) return;

    const orgId = user.organizationId;
    const unsubscribers = [
      onSnapshot(query(collection(db, 'brands'), where('organizationId', '==', orgId)), (snapshot) => {
        setBrands(snapshot.docs.map((item) => item.data() as Brand));
      }),
      onSnapshot(query(collection(db, 'social_accounts'), where('organizationId', '==', orgId)), (snapshot) => {
        setAccounts(snapshot.docs.map((item) => item.data() as SocialAccount));
      }),
      onSnapshot(query(collection(db, 'content'), where('organizationId', '==', orgId)), (snapshot) => {
        setContentList(snapshot.docs.map((item) => normalizeContent(item.data() as ContentItem)));
      }),
      onSnapshot(query(collection(db, 'publishing_jobs'), where('organizationId', '==', orgId)), (snapshot) => {
        setJobs(
          snapshot.docs
            .map((item) => item.data() as PublishingJob)
            .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
        );
      }),
      onSnapshot(query(collection(db, 'publishing_events'), where('organizationId', '==', orgId)), (snapshot) => {
        setEvents(
          snapshot.docs
            .map((item) => item.data() as PublishingEvent)
            .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
            .slice(0, 500)
        );
      }),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [user?.uid, user?.organizationId]);

  const signInGoogle = async () => {
    setAuthLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      setUser({
        uid: cred.user.uid,
        email: cred.user.email || 'naha.thabiso@gmail.com',
        displayName: cred.user.displayName || 'Thabiso Naha',
        role: 'admin',
        organizationId: 'org_nahalabs_hq',
        avatarUrl: cred.user.photoURL || undefined,
      });
    } catch (err) {
      console.warn('Google sign in popup dismissed or not completed, keeping current session.', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
    } catch {}
    setUser(null);
  };

  const loginAsDemoOperator = () => {
    setUser({
      uid: 'usr_thabiso_naha',
      email: 'naha.thabiso@gmail.com',
      displayName: 'Thabiso Naha (Lead)',
      role: 'admin',
      organizationId: 'org_nahalabs_hq',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    });
  };

  const setPublisherMode = (mode: 'mock' | 'autosocial') => {
    setPublisherModeState(mode);
    publisherService.setAdapterType(mode);
  };

  const isFailureSimulated = (platform: Platform) => !!simulatedFailures[platform];

  const toggleSimulatedFailure = (platform: Platform) => {
    const newVal = !simulatedFailures[platform];
    setSimulatedFailures((prev) => ({ ...prev, [platform]: newVal }));
    publisherService.getMockAdapter().setSimulateFailure(platform, newVal);
  };

  const createBrand = async (data: { name: string; code: string; description?: string; color: string }): Promise<Brand> => {
    const newBrand: Brand = {
      id: 'brand_' + data.code.toLowerCase() + '_' + Date.now().toString(36),
      organizationId: user?.organizationId || DEFAULT_ORGANIZATION_ID,
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description,
      color: data.color || '#E65100',
      createdAt: new Date().toISOString(),
      accountsCount: 0,
    };

    if (cloudSession()) {
      await setDoc(doc(db, 'brands', newBrand.id), newBrand);
    } else {
      setBrands((prev) => [newBrand, ...prev]);
    }
    return newBrand;
  };

  const addSocialAccount = async (accData: Omit<SocialAccount, 'id'>): Promise<SocialAccount> => {
    const newAccount: SocialAccount = {
      ...accData,
      organizationId: user?.organizationId || DEFAULT_ORGANIZATION_ID,
      id: 'acc_' + accData.platform + '_' + Date.now().toString(36),
      lastActivityAt: new Date().toISOString(),
    };

    if (cloudSession()) {
      await setDoc(doc(db, 'social_accounts', newAccount.id), newAccount);
      const brand = brands.find((item) => item.id === newAccount.brandId);
      if (brand) {
        await setDoc(doc(db, 'brands', brand.id), { accountsCount: (brand.accountsCount || 0) + 1 }, { merge: true });
      }
    } else {
      setAccounts((prev) => [newAccount, ...prev]);
      setBrands((prev) =>
        prev.map((brand) => brand.id === accData.brandId ? { ...brand, accountsCount: (brand.accountsCount || 0) + 1 } : brand)
      );
    }

    return newAccount;
  };

  const createContent = async (
    itemData: {
      brandId: string;
      title: string;
      videoUrl: string;
      caption: string;
      platforms: Platform[];
      scheduledAt?: string | null;
      mediaStorageKey?: string;
    },
    postNow: boolean = false
  ): Promise<ContentItem> => {
    const initialPlatformStatus: Record<Platform, PlatformPublishStatus> = {
      instagram: itemData.platforms.includes('instagram') ? (postNow ? 'QUEUED' : 'IDLE') : 'IDLE',
      tiktok: itemData.platforms.includes('tiktok') ? (postNow ? 'QUEUED' : 'IDLE') : 'IDLE',
      youtube: itemData.platforms.includes('youtube') ? (postNow ? 'QUEUED' : 'IDLE') : 'IDLE',
    };

    const newItem: ContentItem = {
      id: 'cnt_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      organizationId: user?.organizationId || DEFAULT_ORGANIZATION_ID,
      brandId: itemData.brandId,
      title: itemData.title,
      videoUrl: itemData.videoUrl,
      mediaStorageKey: itemData.mediaStorageKey,
      caption: itemData.caption,
      platforms: itemData.platforms,
      scheduledAt: itemData.scheduledAt || null,
      workflowStatus: postNow || itemData.scheduledAt ? 'APPROVED' : 'DRAFT',
      status: postNow ? 'QUEUED' : itemData.scheduledAt ? 'SCHEDULED' : 'DRAFT',
      platformStatus: initialPlatformStatus,
      platformPostUrls: {},
      platformErrors: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'manual',
    };

    if (cloudSession()) {
      await setDoc(doc(db, 'content', newItem.id), newItem);
    } else {
      setContentList((prev) => [newItem, ...prev]);
    }

    if (postNow) {
      await publishNow(newItem.id, itemData.platforms, newItem);
    }

    return newItem;
  };

  const updateContent = async (id: string, updates: Partial<ContentItem>) => {
    if (cloudSession()) {
      await updateFirestoreContent(id, updates);
      return;
    }
    setContentList((prev) =>
      prev.map((item) => item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item)
    );
  };

  const deleteContent = async (id: string) => {
    if (cloudSession()) {
      await deleteDoc(doc(db, 'content', id));
    } else {
      setContentList((prev) => prev.filter((item) => item.id !== id));
    }
    if (selectedContentItem?.id === id) setSelectedContentItem(null);
  };

  const scheduleContent = async (id: string, scheduledDate: string) => {
    await updateContent(id, {
      scheduledAt: scheduledDate,
      workflowStatus: 'APPROVED',
      status: 'SCHEDULED',
    });
  };

  const reviewContent = async (id: string) => updateContent(id, { workflowStatus: 'IN_REVIEW', status: 'DRAFT' });
  const approveContent = async (id: string) => updateContent(id, { workflowStatus: 'APPROVED' });
  const requestContentChanges = async (id: string) => updateContent(id, { workflowStatus: 'CHANGES_REQUESTED', status: 'DRAFT' });

  const makeJob = (item: ContentItem, platform: Platform, status: PlatformPublishStatus = 'QUEUED'): PublishingJob => {
    const existing = jobs.find((candidate) => candidate.id === 'job_' + item.id + '_' + platform);
    const account = accounts.find((candidate) => candidate.brandId === item.brandId && candidate.platform === platform);
    return {
      ...(existing || {}),
      id: 'job_' + item.id + '_' + platform,
      organizationId: item.organizationId || user?.organizationId || DEFAULT_ORGANIZATION_ID,
      contentId: item.id,
      brandId: item.brandId,
      platform,
      accountHandle: account?.handle || '@brand_' + item.brandId + '_' + platform,
      status,
      scheduledAt: new Date().toISOString(),
      retryCount: existing?.retryCount || 0,
      maxRetries: existing?.maxRetries || 3,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const persistJob = async (job: PublishingJob) => {
    if (cloudSession()) await updateFirestoreJob(job);
    else setJobs((prev) => [job, ...prev.filter((item) => item.id !== job.id)]);
  };

  const runMockJob = async (job: PublishingJob, item: ContentItem) => {
    const result = await publisherService.getMockAdapter().publishJob(job, item, async (event) => {
      const eventRecord: PublishingEvent = {
        ...event,
        id: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        organizationId: item.organizationId || user?.organizationId || DEFAULT_ORGANIZATION_ID,
      };
      if (cloudSession()) await setDoc(doc(db, 'publishing_events', eventRecord.id), eventRecord);
      else setEvents((prev) => [eventRecord, ...prev].slice(0, 100));

      const platformStatus = { ...item.platformStatus, [job.platform]: event.status };
      if (cloudSession()) {
        await updateFirestoreJob({ ...job, status: event.status, updatedAt: new Date().toISOString() });
        await updateFirestoreContent(item.id, {
          platformStatus,
          status: replaceContentStatus(platformStatus, item.platforms),
        });
      } else {
        setJobs((prev) => prev.map((candidate) => candidate.id === job.id ? { ...candidate, status: event.status, updatedAt: new Date().toISOString() } : candidate));
        setContentList((prev) => prev.map((candidate) => candidate.id === item.id ? { ...candidate, platformStatus, status: replaceContentStatus(platformStatus, item.platforms), updatedAt: new Date().toISOString() } : candidate));
      }
    });

    const finalStatus: PlatformPublishStatus = result.success ? 'PUBLISHED' : 'FAILED';
    const finalJob: PublishingJob = {
      ...job,
      status: finalStatus,
      postUrl: result.postUrl,
      errorMessage: result.errorMessage,
      publishedAt: result.success ? new Date().toISOString() : undefined,
      failedAt: result.success ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await persistJob(finalJob);

    let latestItem = item;
    if (cloudSession()) {
      const latestSnapshot = await getDoc(doc(db, 'content', item.id));
      if (latestSnapshot.exists()) latestItem = normalizeContent(latestSnapshot.data() as ContentItem);
    } else {
      const localLatest = contentList.find((candidate) => candidate.id === item.id);
      if (localLatest) latestItem = localLatest;
    }

    const nextPlatformStatus = { ...latestItem.platformStatus, [job.platform]: finalStatus };
    const nextContent = {
      platformStatus: nextPlatformStatus,
      status: replaceContentStatus(nextPlatformStatus, latestItem.platforms),
      platformPostUrls: { ...(latestItem.platformPostUrls || {}), ...(result.postUrl ? { [job.platform]: result.postUrl } : {}) },
      platformErrors: { ...(latestItem.platformErrors || {}), ...(result.errorMessage ? { [job.platform]: result.errorMessage } : {}) },
    };
    if (cloudSession()) await updateFirestoreContent(item.id, nextContent);
    else setContentList((prev) => prev.map((candidate) => candidate.id === item.id ? { ...candidate, ...nextContent, updatedAt: new Date().toISOString() } : candidate));
  };

  const publishNow = async (contentId: string, specificPlatforms?: Platform[], overrideItem?: ContentItem) => {
    const item = overrideItem || contentList.find((candidate) => candidate.id === contentId);
    if (!item) return;
    const targets = (specificPlatforms || item.platforms).filter((platform) => item.platforms.includes(platform));
    if (!targets.length) return;

    const platformStatus = { ...item.platformStatus };
    targets.forEach((platform) => { platformStatus[platform] = 'QUEUED'; });
    const queuedItem = {
      ...item,
      workflowStatus: 'APPROVED' as const,
      status: 'QUEUED' as const,
      platformStatus,
      updatedAt: new Date().toISOString(),
    };

    if (cloudSession()) await setDoc(doc(db, 'content', item.id), queuedItem, { merge: true });
    else setContentList((prev) => prev.map((candidate) => candidate.id === item.id ? queuedItem : candidate));

    for (const platform of targets) {
      const job = makeJob(queuedItem, platform, 'QUEUED');
      await persistJob(job);
      if (publisherMode === 'mock') await runMockJob(job, queuedItem);
    }
  };

  const retryPublish = async (contentId: string, platform?: Platform) => {
    const item = contentList.find((candidate) => candidate.id === contentId);
    if (!item) return;
    const targets = platform ? [platform] : item.platforms.filter((candidate) => ['FAILED', 'FAILED_PERMANENT'].includes(item.platformStatus[candidate]));
    if (!targets.length) return;

    const platformStatus = { ...item.platformStatus };
    targets.forEach((target) => { platformStatus[target] = 'RETRY_PENDING'; });
    const retryItem = {
      ...item,
      workflowStatus: 'APPROVED' as const,
      status: 'QUEUED' as const,
      platformStatus,
      updatedAt: new Date().toISOString(),
    };

    if (cloudSession()) await setDoc(doc(db, 'content', item.id), retryItem, { merge: true });
    else setContentList((prev) => prev.map((candidate) => candidate.id === item.id ? retryItem : candidate));

    for (const target of targets) {
      const job = makeJob(retryItem, target, 'RETRY_PENDING');
      await persistJob(job);
      if (publisherMode === 'mock') await runMockJob(job, retryItem);
    }
  };

  const importCsvBatch = async (rows: Array<{
    brand: string;
    title: string;
    video_url: string;
    caption: string;
    instagram?: boolean;
    tiktok?: boolean;
    youtube?: boolean;
    scheduled_at?: string;
  }>): Promise<{ imported: number; errors: string[] }> => {
    const errors: string[] = [];
    const newItems: ContentItem[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row.title || !row.title.trim()) {
        errors.push(`Row ${rowNum}: Title is required.`);
        continue;
      }

      if (!row.video_url || !row.video_url.trim()) {
        errors.push(`Row ${rowNum}: Video URL is required.`);
        continue;
      }

      // Resolve brand
      let brand = brands.find((b) => b.name.toLowerCase() === row.brand?.toLowerCase() || b.code.toLowerCase() === row.brand?.toLowerCase());
      let brandId = brand?.id;

      if (!brandId) {
        // Auto-create brand if not found
        const brandName = row.brand?.trim() || 'Imported Brand';
        const brandCode = brandName.slice(0, 4).toUpperCase();
        const created = await createBrand({
          name: brandName,
          code: brandCode,
          color: '#E65100',
        });
        brandId = created.id;
      }

      const platforms: Platform[] = [];
      if (row.instagram) platforms.push('instagram');
      if (row.tiktok) platforms.push('tiktok');
      if (row.youtube) platforms.push('youtube');

      if (platforms.length === 0) {
        // Default to instagram & tiktok
        platforms.push('instagram', 'tiktok');
      }

      const initialPlatformStatus: Record<Platform, PlatformPublishStatus> = {
        instagram: 'IDLE',
        tiktok: 'IDLE',
        youtube: 'IDLE',
      };

      const scheduledAt = row.scheduled_at ? new Date(row.scheduled_at).toISOString() : null;

      const item: ContentItem = {
        id: `cnt_csv_${Date.now().toString(36)}_${i}`,
        brandId,
        title: row.title.trim(),
        videoUrl: row.video_url.trim(),
        caption: row.caption || '',
        platforms,
        scheduledAt,
        status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
        platformStatus: initialPlatformStatus,
        platformPostUrls: {},
        platformErrors: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'csv',
      };

      newItems.push(item);
      if (cloudSession()) await setDoc(doc(db, 'content', item.id), item);
    }

    if (newItems.length > 0 && !cloudSession()) {
      setContentList((prev) => [...newItems, ...prev]);
    }

    return { imported: newItems.length, errors };
  };

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        signInGoogle,
        signOut,
        loginAsDemoOperator,
        brands,
        selectedBrandId,
        setSelectedBrandId,
        createBrand,
        accounts,
        addSocialAccount,
        contentList,
        selectedContentItem,
        setSelectedContentItem,
        createContent,
        updateContent,
        deleteContent,
        scheduleContent,
        reviewContent,
        approveContent,
        requestContentChanges,
        publishNow,
        retryPublish,
        jobs,
        events,
        publisherMode,
        setPublisherMode,
        isFailureSimulated,
        toggleSimulatedFailure,
        importCsvBatch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
