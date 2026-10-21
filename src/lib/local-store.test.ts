import { describe, expect, it, vi } from "vitest";
import { createLocalStore } from "@/lib/local-store";

describe("createLocalStore", () => {
  const parse = (raw: unknown) => (Array.isArray(raw) ? (raw as string[]) : []);

  it("returns the same reference while storage is unchanged", () => {
    const store = createLocalStore<string[]>("k", [], parse);
    localStorage.setItem("k", '["x"]');
    expect(store.get()).toBe(store.get());
    expect(store.get()).toEqual(["x"]);
  });

  it("notifies subscribers on set and on storage events", () => {
    const store = createLocalStore<string[]>("k", [], parse);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.set(["a"]);
    expect(listener).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new StorageEvent("storage", { key: "k" }));
    expect(listener).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new StorageEvent("storage", { key: "other" }));
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.set(["b"]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("survives a throwing localStorage", () => {
    const store = createLocalStore<string[]>("k", ["fb"], parse);
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(store.get()).toEqual(["fb"]);
    spy.mockRestore();
  });
});
