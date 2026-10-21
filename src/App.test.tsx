import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const grid = () => screen.getByRole("tabpanel", { name: "Destinos" });
const cityNames = () => within(grid()).getAllByRole("button").map((b) => b.textContent);

describe("App", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders the search, the destination grid and the selected destination's detail", () => {
    render(<App />);
    expect(screen.getByRole("searchbox", { name: "Buscar destinos" })).toBeInTheDocument();
    expect(within(grid()).getAllByRole("img").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 2, name: "Kioto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generar itinerario con IA/ })).toBeInTheDocument();
  });

  it("filters destinations by search, ignoring accents", () => {
    render(<App />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "peru" } });
    expect(cityNames()).toEqual(["CuscoPerú"]);
  });

  it("filters destinations by category tab", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: "Costa" }));
    expect(screen.getByRole("tab", { name: "Costa" })).toHaveAttribute("aria-selected", "true");
    expect(cityNames()).toEqual(["SantoriniGrecia", "Cinque TerreItalia", "Ha LongVietnam"]);
  });

  it("shows an empty state when nothing matches", () => {
    render(<App />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "atlántida" } });
    expect(screen.getByText("Sin resultados para «atlántida».")).toBeInTheDocument();
  });

  it("shows the detail of the card the user picks", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Santorini/ }));
    expect(screen.getByRole("heading", { level: 2, name: "Santorini" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Santorini/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("requests the AI plan for the selected destination", async () => {
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Generar itinerario con IA/ }));

    expect(await screen.findByText("La IA está creando tu plan perfecto")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/ai-plan", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toMatchObject({
      destination: "Kioto, Japón",
    });
  });
});
