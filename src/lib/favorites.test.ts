import { describe, expect, it } from "vitest";
import { FAVORITES_KEY, isFavorite, toggleFavorite } from "@/lib/favorites";
import { makePhoto } from "@/test/make-photo";

const [a, b, c] = ["a", "b", "c"].map(makePhoto);
const storedIds = () => (JSON.parse(localStorage.getItem(FAVORITES_KEY)!) as { id: string }[]).map((p) => p.id);

describe("favorites", () => {
  it("toggles a photo on and off", () => {
    expect(isFavorite(a.id)).toBe(false);
    expect(toggleFavorite(a)).toBe(true);
    expect(isFavorite(a.id)).toBe(true);
    expect(toggleFavorite(a)).toBe(false);
    expect(isFavorite(a.id)).toBe(false);
  });

  it("keeps the newest favorite first", () => {
    toggleFavorite(a);
    toggleFavorite(b);
    toggleFavorite(c);
    expect(storedIds()).toEqual([c.id, b.id, a.id]);
  });

  it("stores the whole photo so the saved page needs no fetch", () => {
    toggleFavorite(a);
    expect(JSON.parse(localStorage.getItem(FAVORITES_KEY)!)).toEqual([a]);
    toggleFavorite(a);
    expect(localStorage.getItem(FAVORITES_KEY)).toBe("[]");
  });

  it("falls back to an empty list on corrupt JSON", () => {
    localStorage.setItem(FAVORITES_KEY, "{not json");
    expect(isFavorite(a.id)).toBe(false);
    expect(toggleFavorite(a)).toBe(true);
    expect(storedIds()).toEqual([a.id]);
  });

  it("falls back to an empty list on a wrong shape", () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify({ [a.id]: true }));
    expect(isFavorite(a.id)).toBe(false);
  });

  it("drops entries that are not photos, such as bare IDs from the older format", () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([a.id, b, { id: "x" }, null]));
    expect(isFavorite(a.id)).toBe(false);
    expect(isFavorite(b.id)).toBe(true);
    expect(isFavorite("x")).toBe(false);
  });
});
