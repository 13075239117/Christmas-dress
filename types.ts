// Extend the window object to support the AI Studio specific API
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}

export interface UploadedImage {
  id: string;
  data: string; // Base64 string without prefix
  mimeType: string;
  previewUrl: string; // Full data URL for display
}

export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface GenerationResult {
  imageUrl: string | null;
  text: string | null;
}