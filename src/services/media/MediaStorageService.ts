import { getDownloadURL, getStorage, ref as storageRef, uploadBytes, deleteObject } from 'firebase/storage';
import { auth, firebaseApp } from '../firebase';

export interface MediaUploadResult {
  url: string;
  storageKey: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface IMediaStorageProvider {
  name: string;
  uploadVideo(file: File, organizationId?: string): Promise<MediaUploadResult>;
  getDownloadUrl(storageKey: string): Promise<string>;
  deleteMedia(storageKey: string): Promise<boolean>;
}

class FirebaseStorageProvider implements IMediaStorageProvider {
  readonly name = 'Firebase Storage';
  private storage = getStorage(firebaseApp);

  async uploadVideo(file: File, organizationId = 'org_nahalabs_hq'): Promise<MediaUploadResult> {
    if (!auth.currentUser) throw new Error('Sign in before uploading media to cloud storage.');

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `users/${auth.currentUser.uid}/media/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
    const target = storageRef(this.storage, storageKey);
    await uploadBytes(target, file, {
      contentType: file.type || 'video/mp4',
      customMetadata: {
        organizationId,
        originalFileName: file.name,
      },
    });
    const url = await getDownloadURL(target);

    return {
      url,
      storageKey,
      fileName: file.name,
      sizeBytes: file.size,
      mimeType: file.type || 'video/mp4',
      thumbnailUrl: '',
    };
  }

  async getDownloadUrl(storageKey: string): Promise<string> {
    if (!storageKey) return '';
    return getDownloadURL(storageRef(this.storage, storageKey));
  }

  async deleteMedia(storageKey: string): Promise<boolean> {
    if (!storageKey) return false;
    try {
      await deleteObject(storageRef(this.storage, storageKey));
      return true;
    } catch {
      return false;
    }
  }
}

class ClientFallbackStorageProvider implements IMediaStorageProvider {
  readonly name = 'Local Demo Media Storage';
  private mediaCache = new Map<string, Blob>();

  async uploadVideo(file: File, _organizationId?: string): Promise<MediaUploadResult> {
    const storageKey = `demo/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${file.name}`;
    this.mediaCache.set(storageKey, file);
    return {
      url: URL.createObjectURL(file),
      storageKey,
      fileName: file.name,
      sizeBytes: file.size,
      mimeType: file.type || 'video/mp4',
      thumbnailUrl: '',
    };
  }

  async getDownloadUrl(storageKey: string): Promise<string> {
    const blob = this.mediaCache.get(storageKey);
    return blob ? URL.createObjectURL(blob) : '';
  }

  async deleteMedia(storageKey: string): Promise<boolean> {
    return this.mediaCache.delete(storageKey);
  }
}

export class MediaStorageService {
  private static instance: MediaStorageService;
  private readonly firebaseProvider = new FirebaseStorageProvider();
  private readonly localProvider = new ClientFallbackStorageProvider();

  private constructor() {}

  static getInstance() {
    if (!MediaStorageService.instance) MediaStorageService.instance = new MediaStorageService();
    return MediaStorageService.instance;
  }

  async upload(file: File, organizationId?: string): Promise<MediaUploadResult> {
    if (auth.currentUser) return this.firebaseProvider.uploadVideo(file, organizationId);
    return this.localProvider.uploadVideo(file, organizationId);
  }

  async getDownloadUrl(storageKey: string): Promise<string> {
    if (storageKey.startsWith('users/')) return this.firebaseProvider.getDownloadUrl(storageKey);
    return this.localProvider.getDownloadUrl(storageKey);
  }

  async deleteMedia(storageKey: string): Promise<boolean> {
    if (storageKey.startsWith('users/')) return this.firebaseProvider.deleteMedia(storageKey);
    return this.localProvider.deleteMedia(storageKey);
  }
}

export const mediaStorageService = MediaStorageService.getInstance();