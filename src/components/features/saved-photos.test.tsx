import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SavedLink } from "@/components/features/saved-link";
import { SavedPhotos } from "@/components/features/saved-photos";
import { FAVORITES_KEY } from "@/lib/favorites";
import { makePhoto } from "@/test/make-photo";

const save = (...ids: number[]) => localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids.map(makePhoto)));
const tileLinks = () =>
  screen.getAllByRole("link").filter((link) => link.getAttribute("href")?.startsWith("/destination/"));

describe("SavedPhotos", () => {
  it("shows an empty state that links back to the feed", () => {
    render(<SavedPhotos />);
    expect(screen.getByRole("heading", { name: "Aún no has guardado ningún lugar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explorar destinos" })).toHaveAttribute("href", "/");
  });

  it("lists saved photos newest first, straight from storage", () => {
    save(3, 1, 2);
    render(<SavedPhotos />);
    expect(screen.getByRole("heading", { name: "Guardados" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("3 lugares");
    expect(tileLinks().map((link) => link.getAttribute("href"))).toEqual([
      "/destination/p3",
      "/destination/p1",
      "/destination/p2",
    ]);
  });

  it("removes a tile when it is unsaved, down to the empty state", () => {
    vi.stubGlobal("fetch", vi.fn());
    save(1, 2);
    render(<SavedPhotos />);
    fireEvent.click(screen.getAllByRole("button", { name: "Quitar de guardados" })[0]);
    expect(tileLinks()).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("1 lugar");
    fireEvent.click(screen.getByRole("button", { name: "Quitar de guardados" }));
    expect(screen.getByRole("heading", { name: "Aún no has guardado ningún lugar" })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

describe("SavedLink", () => {
  it("links to the saved page and shows the count once there are favorites", () => {
    const { unmount } = render(<SavedLink />);
    expect(screen.getByRole("link", { name: "Guardados" })).toHaveAttribute("href", "/saved");
    unmount();
    save(1, 2);
    render(<SavedLink />);
    expect(screen.getByRole("link", { name: "Guardados (2)" })).toHaveTextContent("2");
  });
});
