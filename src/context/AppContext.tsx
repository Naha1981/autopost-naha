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
  doc,
  googleProvider,
  onAuthStateChanged,
  onSnapshot,
  setDoc,
  signInWithPopup,
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
    },
    postNow?: boolean
  ) => Promise<ContentItem>;
  updateContent: (id: string, updates: Partial<ContentItem>) => Promise<void>;
  deleteContent: (id: string) => Promise<void>;
  scheduleContent: (id: string, scheduledDate: string) => Promise<void>;
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

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_CONTENT, JSON.stringify(contentList));
  }, [contentList]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_BRANDS, JSON.stringify(brands));
  }, [brands]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_JOBS, JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_EVENTS, JSON.stringify(events));
  }, [events]);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setUser({
          uid: fbUser.uid,
          email: fbUser.email || 'naha.thabiso@gmail.com',
          displayName: fbUser.displayName || 'Thabiso Naha',
          role: 'admin',
          organizationId: 'org_nahalabs_hq',
          avatarUrl: fbUser.photoURL || undefined,
        });
      }
    });
    return () => unsubscribe();
  }, []);

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
      id: `brand_${data.code.toLowerCase()}_${Date.now().toString(36)}`,
      organizationId: user?.organizationId || 'org_nahalabs_hq',
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description,
      color: data.color || '#E65100',
      createdAt: new Date().toISOString(),
      accountsCount: 0,
    };

    setBrands((prev) => [newBrand, ...prev]);

    // Background Firestore attempt
    try {
      await setDoc(doc(db, 'brands', newBrand.id), newBrand);
    } catch (e) {
      console.info('Firestore offline/fallback mode active for brands');
    }

    return newBrand;
  };

  const addSocialAccount = async (accData: Omit<SocialAccount, 'id'>): Promise<SocialAccount> => {
    const newAccount: SocialAccount = {
      ...accData,
      id: `acc_${accData.platform}_${Date.now().toString(36)}`,
      lastActivityAt: new Date().toISOString(),
    };

    setAccounts((prev) => [newAccount, ...prev]);

    // Update brand count
    setBrands((prev) =>
      prev.map((b) => (b.id === accData.brandId ? { ...b, accountsCount: (b.accountsCount || 0) + 1 } : b))
    );

    try {
      await setDoc(doc(db, 'social_accounts', newAccount.id), newAccount);
    } catch (e) {}

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
    },
    postNow: boolean = false
  ): Promise<ContentItem> => {
    const initialPlatformStatus: Record<Platform, PlatformPublishStatus> = {
      instagram: itemData.platforms.includes('instagram') ? (postNow ? 'QUEUED' : 'IDLE') : 'IDLE',
      tiktok: itemData.platforms.includes('tiktok') ? (postNow ? 'QUEUED' : 'IDLE') : 'IDLE',
      youtube: itemData.platforms.includes('youtube') ? (postNow ? 'QUEUED' : 'IDLE') : 'IDLE',
    };

    const globalStatus: GlobalPublishStatus = postNow
      ? 'QUEUED'
      : itemData.scheduledAt
      ? 'SCHEDULED'
      : 'DRAFT';

    const newItem: ContentItem = {
      id: `cnt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      brandId: itemData.brandId,
      title: itemData.title,
      videoUrl: itemData.videoUrl,
      caption: itemData.caption,
      platforms: itemData.platforms,
      scheduledAt: itemData.scheduledAt || null,
      status: globalStatus,
      platformStatus: initialPlatformStatus,
      platformPostUrls: {},
      platformErrors: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'manual',
    };

    setContentList((prev) => [newItem, ...prev]);

    try {
      await setDoc(doc(db, 'content', newItem.id), newItem);
    } catch (e) {}

    if (postNow) {
      // Trigger execution pipeline immediately
      setTimeout(() => {
        publishNow(newItem.id, itemData.platforms);
      }, 50);
    }

    return newItem;
  };

  const updateContent = async (id: string, updates: Partial<ContentItem>) => {
    setContentList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item))
    );
    try {
      await setDoc(doc(db, 'content', id), { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {}
  };

  const deleteContent = async (id: string) => {
    setContentList((prev) => prev.filter((i) => i.id !== id));
    if (selectedContentItem?.id === id) {
      setSelectedContentItem(null);
    }
  };

  const scheduleContent = async (id: string, scheduledDate: string) => {
    await updateContent(id, {
      scheduledAt: scheduledDate,
      status: 'SCHEDULED',
    });
  };

  // Helper to compute overall status from individual platform states
  const calculateGlobalStatus = (platformStatus: Record<Platform, PlatformPublishStatus>, activePlatforms: Platform[]): GlobalPublishStatus => {
    const statuses = activePlatforms.map((p) => platformStatus[p]);
    const allPublished = statuses.every((s) => s === 'PUBLISHED');
    if (allPublished) return 'PUBLISHED';
    const allFailed = statuses.every((s) => s === 'FAILED');
    if (allFailed) return 'FAILED';
    const anyPublishing = statuses.some((s) => s === 'PUBLISHING' || s === 'STAGED' || s === 'CLAIMED');
    if (anyPublishing) return 'PUBLISHING';
    const anyQueued = statuses.some((s) => s === 'QUEUED');
    if (anyQueued) return 'QUEUED';
    const anyPublished = statuses.some((s) => s === 'PUBLISHED');
    if (anyPublished) return 'PARTIAL';
    return 'DRAFT';
  };

  // Core Publishing Pipeline
  const publishNow = async (contentId: string, specificPlatforms?: Platform[]) => {
    const item = contentList.find((c) => c.id === contentId);
    if (!item) return;

    const targetPlatforms = specificPlatforms || item.platforms;
    if (targetPlatforms.length === 0) return;

    // 1. Mark target platforms as QUEUED
    const updatedPlatformStatus = { ...item.platformStatus };
    targetPlatforms.forEach((p) => {
      updatedPlatformStatus[p] = 'QUEUED';
    });

    const newGlobalStatus = calculateGlobalStatus(updatedPlatformStatus, item.platforms);

    setContentList((prev) =>
      prev.map((c) =>
        c.id === contentId
          ? {
              ...c,
              status: newGlobalStatus,
              platformStatus: updatedPlatformStatus,
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );

    // 2. Create and execute publishing jobs for each platform asynchronously
    targetPlatforms.forEach(async (platform) => {
      // Find matching social account for this brand and platform
      const account = accounts.find((a) => a.brandId === item.brandId && a.platform === platform);
      const accountHandle = account ? account.handle : `@brand_${item.brandId}_${platform}`;

      const jobId = `job_${Date.now().toString(36)}_${platform}_${Math.random().toString(36).substring(2, 5)}`;
      const newJob: PublishingJob = {
        id: jobId,
        contentId: item.id,
        brandId: item.brandId,
        platform,
        accountHandle,
        status: 'QUEUED',
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setJobs((prev) => [newJob, ...prev]);

      // Progress event handler
      const handleProgress = (event: Omit<PublishingEvent, 'id'>) => {
        const fullEvent: PublishingEvent = {
          ...event,
          id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        };
        setEvents((prev) => [fullEvent, ...prev.slice(0, 100)]); // Keep last 100 events

        // Update current platform status
        setContentList((currentList) =>
          currentList.map((c) => {
            if (c.id === contentId) {
              const pStatus = { ...c.platformStatus, [platform]: event.status };
              return {
                ...c,
                status: calculateGlobalStatus(pStatus, c.platforms),
                platformStatus: pStatus,
              };
            }
            return c;
          })
        );

        setJobs((currentJobs) =>
          currentJobs.map((j) => (j.id === jobId ? { ...j, status: event.status, updatedAt: new Date().toISOString() } : j))
        );
      };

      // Execute via adapter
      const result = await publisherService.publishPlatformJob(newJob, item, handleProgress);

      // Final status update for this platform
      setContentList((currentList) =>
        currentList.map((c) => {
          if (c.id === contentId) {
            const pStatus = { ...c.platformStatus, [platform]: result.success ? ('PUBLISHED' as const) : ('FAILED' as const) };
            const pUrls = { ...c.platformPostUrls, ...(result.postUrl ? { [platform]: result.postUrl } : {}) };
            const pErrs = { ...c.platformErrors, ...(result.errorMessage ? { [platform]: result.errorMessage } : {}) };

            return {
              ...c,
              status: calculateGlobalStatus(pStatus, c.platforms),
              platformStatus: pStatus,
              platformPostUrls: pUrls,
              platformErrors: pErrs,
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        })
      );

      setJobs((currentJobs) =>
        currentJobs.map((j) =>
          j.id === jobId
            ? {
                ...j,
                status: result.success ? 'PUBLISHED' : 'FAILED',
                postUrl: result.postUrl,
                errorMessage: result.errorMessage,
                publishedAt: result.success ? new Date().toISOString() : undefined,
                failedAt: !result.success ? new Date().toISOString() : undefined,
                updatedAt: new Date().toISOString(),
              }
            : j
        )
      );
    });
  };

  const retryPublish = async (contentId: string, platform?: Platform) => {
    const item = contentList.find((c) => c.id === contentId);
    if (!item) return;

    if (platform) {
      await publishNow(contentId, [platform]);
    } else {
      // Find all failed platforms on this item
      const failedPlatforms = item.platforms.filter((p) => item.platformStatus[p] === 'FAILED');
      if (failedPlatforms.length > 0) {
        await publishNow(contentId, failedPlatforms);
      } else {
        await publishNow(contentId, item.platforms);
      }
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
    }

    if (newItems.length > 0) {
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
