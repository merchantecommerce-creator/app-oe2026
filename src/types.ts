
export interface ProductImage {
  id: string;
  originalUrl: string;
  blob: Blob | null;
  objectUrl: string | null;
  status: 'pending' | 'converting' | 'success' | 'error';
  suggestedName?: string; // From Gemini
  width?: number;
  height?: number;
}

export interface ExtractionResult {
  productName: string;
  images: string[]; // URLs
}

export interface VtexConfig {
  accountName: string;
  appKey: string;
  appToken: string;
  environment: string;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  FETCHING_INFO = 'FETCHING_INFO',
  DOWNLOADING = 'DOWNLOADING',
  CONVERTING = 'CONVERTING',
  ANALYZING_AI = 'ANALYZING_AI',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}
