import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MasonryGrid } from "@/components/features/masonry-grid";
import { makePhoto } from "@/test/make-photo";

const photos = (n: number) => Array.from({ length: n }, (_, i) => makePhoto(i));
const delays = () => screen.getAllByRole("listitem").map((li) => li.style.animationDelay);

describe("MasonryGrid entrance animation", () => {
  it("staggers delays by 40ms from the first tile", () => {
    render(<MasonryGrid photos={photos(5)} />);
    expect(delays()).toEqual(["0ms", "40ms", "80ms", "120ms", "160ms"]);
  });

  it("counts delays from staggerFrom and keeps earlier tiles at 0ms", () => {
    render(<MasonryGrid photos={photos(6)} staggerFrom={3} />);
    expect(delays()).toEqual(["0ms", "0ms", "0ms", "0ms", "40ms", "80ms"]);
  });

  it("caps the delay at 600ms", () => {
    render(<MasonryGrid photos={photos(20)} />);
    const all = delays();
    expect(all[14]).toBe("560ms");
    expect(all[15]).toBe("600ms");
    expect(all[19]).toBe("600ms");
  });

  it("applies the entrance classes to photo tiles", () => {
    render(<MasonryGrid photos={photos(1)} />);
    const cls = screen.getAllByRole("listitem")[0].className;
    for (const c of [
      "motion-safe:animate-in",
      "motion-safe:fade-in",
      "motion-safe:slide-in-from-bottom-2",
      "fill-mode-both",
      "duration-500",
    ]) {
      expect(cls).toContain(c);
    }
  });

  it("does not animate placeholders", () => {
    const { container } = render(<MasonryGrid photos={photos(2)} placeholders={3} />);
    const placeholders = Array.from(container.querySelectorAll("li")).slice(2);
    expect(placeholders).toHaveLength(3);
    for (const li of placeholders) {
      expect(li.className).not.toContain("animate");
      expect(li.style.animationDelay).toBe("");
    }
  });
});
