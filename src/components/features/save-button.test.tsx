import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaveButton } from "@/components/features/save-button";
import { FAVORITES_KEY } from "@/lib/favorites";
import { makePhoto } from "@/test/make-photo";

const p1 = makePhoto(1);

const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));

afterEach(() => {
  fetchMock.mockClear();
  vi.unstubAllGlobals();
});

describe("SaveButton", () => {
  it("renders unsaved", () => {
    render(<SaveButton photo={p1} />);
    const button = screen.getByRole("button", { name: "Guardar" });
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("saves on click and stores the id", () => {
    vi.stubGlobal("fetch", fetchMock);
    render(<SaveButton photo={p1} />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    const button = screen.getByRole("button", { name: "Quitar de guardados" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(JSON.parse(localStorage.getItem(FAVORITES_KEY)!)).toEqual([p1]);
  });

  it("tracks the download only when saving", () => {
    vi.stubGlobal("fetch", fetchMock);
    render(<SaveButton photo={p1} />);
    fireEvent.click(screen.getByRole("button"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/photos/p1/download", { method: "POST" });
    fireEvent.click(screen.getByRole("button"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("renders saved when storage already has the id", () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([p1]));
    render(<SaveButton photo={p1} />);
    expect(screen.getByRole("button", { name: "Quitar de guardados" })).toHaveAttribute("aria-pressed", "true");
  });

  describe("heart pop animation", () => {
    const icon = () => screen.getByRole("button").querySelector('[data-slot="heart-icon"]')!;
    const ring = () => screen.getByRole("button").querySelector('[data-slot="heart-ring"]');

    it("plays after a save click", () => {
      vi.stubGlobal("fetch", fetchMock);
      render(<SaveButton photo={p1} />);
      expect(icon().getAttribute("class")).not.toContain("animate-heart-pop");
      fireEvent.click(screen.getByRole("button"));
      expect(icon().getAttribute("class")).toContain("animate-heart-pop");
      expect(ring()).toHaveAttribute("aria-hidden", "true");
      expect(ring()!.getAttribute("class")).toContain("animate-heart-ring");
    });

    it("does not play after an unsave click", () => {
      vi.stubGlobal("fetch", fetchMock);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([p1]));
      render(<SaveButton photo={p1} />);
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
      expect(icon().getAttribute("class")).not.toContain("animate-heart-pop");
      expect(ring()).toBeNull();
    });

    it("does not play on first render of an already-saved photo", () => {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([p1]));
      render(<SaveButton photo={p1} />);
      expect(icon().getAttribute("class")).not.toContain("animate-heart-pop");
      expect(ring()).toBeNull();
    });

    it("remounts the icon on every new save so it replays", () => {
      vi.stubGlobal("fetch", fetchMock);
      render(<SaveButton photo={p1} />);
      fireEvent.click(screen.getByRole("button"));
      const first = icon();
      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByRole("button"));
      expect(icon()).not.toBe(first);
      expect(icon().getAttribute("class")).toContain("animate-heart-pop");
    });
  });
});
