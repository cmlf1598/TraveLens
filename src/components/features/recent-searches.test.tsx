import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecentSearches } from "@/components/features/recent-searches";
import { RECENT_SEARCHES_KEY } from "@/lib/recent-searches";

const seed = (list: string[]) => localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
const stored = () => JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)!);

describe("RecentSearches", () => {
  it("renders nothing when empty", () => {
    const { container } = render(<RecentSearches />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders chips linking to the search", () => {
    seed(["Kioto", "São Paulo"]);
    render(<RecentSearches />);
    expect(screen.getByRole("link", { name: "Kioto" })).toHaveAttribute("href", "/?q=Kioto");
    expect(screen.getByRole("link", { name: "São Paulo" })).toHaveAttribute("href", `/?q=${encodeURIComponent("São Paulo")}`);
  });

  it("moves a clicked chip to the front", () => {
    seed(["Kioto", "Bali"]);
    render(<RecentSearches />);
    fireEvent.click(screen.getByRole("link", { name: "Bali" }));
    expect(stored()).toEqual(["Bali", "Kioto"]);
  });

  it("removes one chip", () => {
    seed(["Kioto", "Bali"]);
    render(<RecentSearches />);
    fireEvent.click(screen.getByRole("button", { name: "Quitar «Kioto» de búsquedas recientes" }));
    expect(screen.queryByRole("link", { name: "Kioto" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bali" })).toBeInTheDocument();
    expect(stored()).toEqual(["Bali"]);
  });

  it("clears all with Borrar", () => {
    seed(["Kioto", "Bali"]);
    const { container } = render(<RecentSearches />);
    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    expect(container).toBeEmptyDOMElement();
    expect(stored()).toEqual([]);
  });
});
