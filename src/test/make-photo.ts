import type { Photo } from "@/types/travel";

/** A minimal valid `Photo` for component and store tests. */
export function makePhoto(i: number | string): Photo {
  return {
    id: `p${i}`,
    width: 800,
    height: 1000,
    color: "#cccccc",
    blurHash: null,
    alt: `Foto ${i}`,
    title: `Foto ${i}`,
    subtitle: null,
    description: null,
    cityName: null,
    country: null,
    location: null,
    tags: [],
    urls: {
      thumb: "https://images.unsplash.com/t.jpg",
      small: "https://images.unsplash.com/s.jpg",
      regular: "https://images.unsplash.com/r.jpg",
    },
    photographer: { name: "Ana", username: "ana", profileUrl: "https://unsplash.com/@ana" },
    unsplashUrl: `https://unsplash.com/photos/p${i}`,
  };
}
