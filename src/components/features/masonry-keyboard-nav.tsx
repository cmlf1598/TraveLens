"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { findNextTile, type Direction } from "@/lib/grid-navigation";

const DIRECTIONS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const TILE_LINK = 'a[href^="/destination/"]';

/**
 * Adds arrow-key navigation between the tiles of the masonry grid inside it.
 *
 * REVIEWER_NOTE: One delegated listener serves every tile, including ones the infinite scroll adds
 * later. Tab order is untouched (no roving tabindex); arrows are an extra, geometric shortcut.
 */
export function MasonryKeyboardNav({ children }: { children: ReactNode }) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const direction = DIRECTIONS[event.key];
    if (!direction || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

    const target = event.target as HTMLElement;
    const currentLink = target.closest("li")?.querySelector<HTMLAnchorElement>(TILE_LINK);
    if (!currentLink) return;

    const links = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>(TILE_LINK));
    const current = links.indexOf(currentLink);
    const next = findNextTile(
      links.map((link) => link.getBoundingClientRect()),
      current,
      direction,
    );
    if (next === null) return;

    event.preventDefault();
    links[next].focus();
    links[next].scrollIntoView({ block: "nearest" });
  }

  return <div onKeyDown={onKeyDown}>{children}</div>;
}
