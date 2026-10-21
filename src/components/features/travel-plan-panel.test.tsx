import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TravelPlanPanel } from "@/components/features/travel-plan-panel";
import type { TravelPlan } from "@/types/travel";

const PLAN: TravelPlan = {
  intro: "Una ciudad de templos.",
  days: [1, 2, 3].map((day) => ({ day, title: `Día ${day}`, activities: [`Actividad ${day}`] })),
  hiddenGem: { name: "Jardín secreto", description: "Tranquilo." },
  localFood: [{ dish: "Ramen", description: "Caldo intenso." }],
};

const request = { destination: "Kioto, Japón", context: { photoId: "p1" } };
const banner = () => screen.queryByTestId("plan-generating");

describe("TravelPlanPanel loading animation", () => {
  let resolveFetch: (res: Response) => void;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((resolve) => (resolveFetch = resolve))),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("tells the user the AI is writing the plan, naming the destination", () => {
    render(<TravelPlanPanel {...request} />);
    expect(banner()).toHaveTextContent("La IA está creando tu plan perfecto");
    expect(banner()).toHaveTextContent("Estudiando Kioto…");
    expect(screen.getByRole("status")).toHaveTextContent("Generando tu plan de viaje…");
  });

  it("advances through the steps and stops at the last one", () => {
    render(<TravelPlanPanel {...request} />);
    act(() => vi.advanceTimersByTime(1800));
    expect(banner()).toHaveTextContent("Buscando los rincones imprescindibles…");
    act(() => vi.advanceTimersByTime(1800 * 20));
    expect(banner()).toHaveTextContent("Dando los últimos toques…");
  });

  it("replaces the animation with the plan once it arrives", async () => {
    render(<TravelPlanPanel {...request} />);
    await act(async () => resolveFetch(Response.json(PLAN)));
    expect(banner()).toBeNull();
    expect(screen.getByText("Una ciudad de templos.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Plan de viaje listo.");
  });
});
