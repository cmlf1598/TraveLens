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
  title: string;
  city: string | null;
  country: string | null;
  tags: string[];
  urls: {
    thumb: string;
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
  title: string;
  city?: string;
  country?: string;
  tags?: string[];
}

export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
}

export interface DestinationInsight {
  destination: string;
  summary: string;
  bestTimeToVisit: string;
  highlights: string[];
  itinerary: ItineraryDay[];
  travelTips: string[];
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}
