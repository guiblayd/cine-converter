
export interface Movie {
  title: string;
  year: string | number;
  rating?: string | number;
  isFavorite?: boolean;
  comment?: string;
  watchedDate?: string;
  listType?: 'watched' | 'watchlist';
}

export enum AppStep {
  INITIAL = 'INITIAL',
  CONSENT = 'CONSENT',
  EXTRACTION = 'EXTRACTION',
  UPLOAD = 'UPLOAD',
  REVIEW = 'REVIEW'
}

export enum ExtractionMode {
  STANDARD = 'STANDARD'
}
