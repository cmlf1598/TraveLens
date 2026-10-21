import { describe, expect, it } from "vitest";
import {
  RECENT_SEARCHES_KEY,
  addRecentSearch,
  clearRecentSearches,
  pushRecent,
  removeRecentSearch,
} from "@/lib/recent-searches";

const stored = () => JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)!);

describe("pushRecent", () => {
  it("trims and puts the query first", () => {
    expect(pushRecent(["Bali"], "  Kioto ")).toEqual(["Kioto", "Bali"]);
  });

  it("ignores empty strings", () => {
    const list = ["Bali"];
    expect(pushRecent(list, "")).toEqual(["Bali"]);
    expect(pushRecent(list, "   ")).toEqual(["Bali"]);
  });

  it("dedupes case-insensitively, keeping the new casing and moving it first", () => {
    expect(pushRecent(["Bali", "kioto", "Roma"], "KIOTO")).toEqual(["KIOTO", "Bali", "Roma"]);
  });

  it("caps at 6 by default and honours a custom max", () => {
    const list = ["a", "b", "c", "d", "e", "f"];
    expect(pushRecent(list, "g")).toEqual(["g", "a", "b", "c", "d", "e"]);
    expect(pushRecent(list, "g", 2)).toEqual(["g", "a"]);
  });
});

describe("recent searches store", () => {
  it("adds newest first and persists", () => {
    addRecentSearch("Bali");
    addRecentSearch("Kioto");
    expect(stored()).toEqual(["Kioto", "Bali"]);
  });

  it("removes case-insensitively", () => {
    addRecentSearch("Bali");
    addRecentSearch("Kioto");
    removeRecentSearch("bali");
    expect(stored()).toEqual(["Kioto"]);
  });

  it("clears everything", () => {
    addRecentSearch("Bali");
    clearRecentSearches();
    expect(stored()).toEqual([]);
  });

  it("falls back to empty on a wrong shape", () => {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([1, 2]));
    addRecentSearch("Bali");
    expect(stored()).toEqual(["Bali"]);
  });
});
