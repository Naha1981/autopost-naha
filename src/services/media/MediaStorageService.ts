import { auth, deleteObject, getDownloadURL, ref, storage, uploadBytes } from '../firebase';

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
  uploadVideo(file: File): Promise<MediaUploadResult>;
  getDownloadUrl(storageKey: string): Promise<string>;
  deleteMedia(storageKey: string): Promise<boolean>;
}

export class FirebaseMediaStorageProvider implements IMediaStorageProvider {
  readonly name = 'Firebase Storage';

  private requireUid() {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sign in with Google before uploading media.');
    return uid;
  }

  async uploadVideo(file: File): Promise<MediaUploadResult> {
    const uid = this.requireUid();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = 'users/' + uid + '/media/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '_' + safeName;
    const storageRef = ref(storage, storageKey);
    const snapshot = await uploadBytes(storageRef, file, { contentType: file.type || 'video/mp4' });
    const url = await getDownloadURL(snapshot.ref);
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
    this.requireUid();
    return getDownloadURL(ref(storage, storageKey));
  }

  async deleteMedia(storageKey: string): Promise<boolean> {
    this.requireUid();
    try {
      await deleteObject(ref(storage, storageKey));
      return true;
    } catch {
      return false;
    }
  }
}

export class MediaStorageService {
  private static instance: MediaStorageService;
  private provider: IMediaStorageProvider;

  private constructor() {
    this.provider = new FirebaseMediaStorageProvider();
  }

  static getInstance(): MediaStorageService {
    if (!MediaStorageService.instance) MediaStorageService.instance = new MediaStorageService();
    return MediaStorageService.instance;
  }

  setProvider(provider: IMediaStorageProvider) { this.provider = provider; }
  async upload(file: File) { return this.provider.uploadVideo(file); }
  async getDownloadUrl(storageKey: string) { return this.provider.getDownloadUrl(storageKey); }
  async deleteMedia(storageKey: string) { return this.provider.deleteMedia(storageKey); }
}

export const mediaStorageService = MediaStorageService.getInstance();