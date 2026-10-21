import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchBar } from "@/components/features/search-bar";
import { RECENT_SEARCHES_KEY } from "@/lib/recent-searches";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const stored = () => localStorage.getItem(RECENT_SEARCHES_KEY);

describe("SearchBar recent searches", () => {
  it("records the trimmed value on Enter", () => {
    render(<SearchBar />);
    const input = screen.getByRole("searchbox", { name: "Buscar destinos" });
    fireEvent.change(input, { target: { value: "  Kioto " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(JSON.parse(stored()!)).toEqual(["Kioto"]);
  });

  it("records on blur but not while typing or when empty", () => {
    render(<SearchBar />);
    const input = screen.getByRole("searchbox", { name: "Buscar destinos" });
    fireEvent.change(input, { target: { value: "Par" } });
    expect(stored()).toBeNull();
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(stored()).toBeNull();
    fireEvent.change(input, { target: { value: "París" } });
    fireEvent.blur(input);
    expect(JSON.parse(stored()!)).toEqual(["París"]);
  });
});
