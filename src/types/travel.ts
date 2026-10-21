export type PhotoOrientation = "landscape" | "portrait" | "squarish";

export interface Photographer {
  name: string;
  username: string;
  profileUrl: string;
}

/** App-level photo model, normalized from the Unsplash API response. */
export interface Photo {
  id: string;
  /** Intrinsic dimensions; the grid reserves `height / width` before the image loads. */
  width: number;
  height: number;
  /** Dominant color, used as the tile placeholder background. */
  color: string;
  blurHash: string | null;
  alt: string;
  description: string | null;
  location: string | null;
  urls: {
    small: string;
    regular: string;
    full: string;
  };
  photographer: Photographer;
  /** Photo page on unsplash.com, required for attribution. */
  unsplashUrl: string;
}

export interface PhotoSearchParams {
  query: string;
  page?: number;
  perPage?: number;
  orientation?: PhotoOrientation;
}

export interface PhotoSearchResult {
  photos: Photo[];
  page: number;
  totalPages: number;
}

export interface DestinationInsightRequest {
  photoId: string;
  description: string;
  location?: string;
}

export interface DestinationInsight {
  title: string;
  summary: string;
  bestTimeToVisit: string;
  highlights: string[];
  travelTips: string[];
  tags: string[];
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}
