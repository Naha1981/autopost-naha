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
  getDownloadUrl(storageKey: string, expirationMinutes?: number): Promise<string>;
  deleteMedia(storageKey: string): Promise<boolean>;
}

/**
 * Browser-compatible Local & Object-URL Storage Provider.
 * Stores small sample media in browser IndexedDB/Cache/Object URLs or data blobs
 * without requiring expensive cloud buckets during development.
 */
export class ClientMediaStorageProvider implements IMediaStorageProvider {
  readonly name = 'NahaLabs Local Client Storage';
  private mediaCache = new Map<string, { blob: Blob; fileName: string; mimeType: string }>();

  async uploadVideo(file: File): Promise<MediaUploadResult> {
    const storageKey = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.mediaCache.set(storageKey, {
      blob: file,
      fileName: file.name,
      mimeType: file.type || 'video/mp4',
    });

    const url = URL.createObjectURL(file);
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
    const cached = this.mediaCache.get(storageKey);
    if (cached) {
      return URL.createObjectURL(cached.blob);
    }
    return '';
  }

  async deleteMedia(storageKey: string): Promise<boolean> {
    return this.mediaCache.delete(storageKey);
  }
}

export class MediaStorageService {
  private static instance: MediaStorageService;
  private provider: IMediaStorageProvider;

  private constructor() {
    this.provider = new ClientMediaStorageProvider();
  }

  static getInstance(): MediaStorageService {
    if (!MediaStorageService.instance) {
      MediaStorageService.instance = new MediaStorageService();
    }
    return MediaStorageService.instance;
  }

  setProvider(provider: IMediaStorageProvider) {
    this.provider = provider;
  }

  async upload(file: File): Promise<MediaUploadResult> {
    return await this.provider.uploadVideo(file);
  }

  async getDownloadUrl(storageKey: string): Promise<string> {
    return await this.provider.getDownloadUrl(storageKey);
  }
}

export const mediaStorageService = MediaStorageService.getInstance();
