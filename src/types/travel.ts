export interface Photographer {
  name: string;
  username: string;
  profileUrl: string;
}

/**
 * How a photo's title/subtitle are composed:
 * - `home`: title = the curated city the photo was fetched for, subtitle = description.
 * - `search`: title = description, subtitle = tags ("Nature • City • Travel").
 */
export type PhotoMode = "home" | "search";

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
  /** Display copy, composed according to `PhotoMode`. Never contains IDs or file names. */
  title: string;
  subtitle: string | null;
  /** Cleaned description: `description` → `alternative_slugs.es` → `alt_description`. */
  description: string | null;
  /** City on its own, for follow-up queries ("Paris"). */
  cityName: string | null;
  country: string | null;
  /** Full place name with repeated segments removed ("Sydney, Australia"). */
  location: string | null;
  tags: string[];
  urls: {
    thumb: string;
    small: string;
    regular: string;
  };
  photographer: Photographer;
  /** Photo page on unsplash.com, required for attribution. */
  unsplashUrl: string;
}

/** A normalized photo before its mode-specific title/subtitle are composed. */
export type PhotoRecord = Omit<Photo, "title" | "subtitle">;

export interface PhotoSearchResult {
  photos: Photo[];
  page: number;
  totalPages: number;
  /** Set for the home feed: pass it back to get the next page of the same random city order. */
  seed?: number;
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
