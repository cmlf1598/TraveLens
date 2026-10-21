import { describe, expect, it } from "vitest";
import { findNextTile, type Rect } from "@/lib/grid-navigation";

// Three 100px-wide columns, uneven heights. DOM order is column by column, like CSS columns:
//   col 0: 0 (0-100), 1 (110-310), 2 (320-420)
//   col 1: 3 (0-250), 4 (260-360), 5 (370-470)
//   col 2: 6 (0-80), 7 (90-190), 8 (200-500)
const rect = (col: number, top: number, height: number): Rect => ({ left: col * 110, top, width: 100, height });
const rects: Rect[] = [
  rect(0, 0, 100),
  rect(0, 110, 200),
  rect(0, 320, 100),
  rect(1, 0, 250),
  rect(1, 260, 100),
  rect(1, 370, 100),
  rect(2, 0, 80),
  rect(2, 90, 100),
  rect(2, 200, 300),
];

describe("findNextTile", () => {
  it("moves down and up within a column", () => {
    expect(findNextTile(rects, 0, "down")).toBe(1);
    expect(findNextTile(rects, 1, "down")).toBe(2);
    expect(findNextTile(rects, 2, "up")).toBe(1);
    expect(findNextTile(rects, 4, "up")).toBe(3);
  });

  it("returns null at the top and bottom edges", () => {
    expect(findNextTile(rects, 0, "up")).toBeNull();
    expect(findNextTile(rects, 3, "up")).toBeNull();
    expect(findNextTile(rects, 2, "down")).toBeNull();
    expect(findNextTile(rects, 8, "down")).toBeNull();
  });

  it("moves right to the tile with the closest vertical center in the next column", () => {
    // tile 1 center y = 210: tile 3 (125), tile 4 (310), tile 5 (420) -> 3 is closest by 85
    expect(findNextTile(rects, 1, "right")).toBe(3);
    // tile 2 center y = 370: tile 5 (420, diff 50) is closer than 4 (310, diff 60)
    expect(findNextTile(rects, 2, "right")).toBe(5);
    // tile 5 center y = 420: tile 8 (350), 7 (140) -> 8
    expect(findNextTile(rects, 5, "right")).toBe(8);
  });

  it("moves left to the tile with the closest vertical center in the previous column", () => {
    // tile 7 center y = 140: tile 3 (125) wins over 4 (310)
    expect(findNextTile(rects, 7, "left")).toBe(3);
    // tile 8 center y = 350: tile 4 (310)
    expect(findNextTile(rects, 8, "left")).toBe(4);
    // tile 5 center y = 420: tile 2 (370) over 1 (210)
    expect(findNextTile(rects, 5, "left")).toBe(2);
  });

  it("returns null at the left and right edges", () => {
    expect(findNextTile(rects, 0, "left")).toBeNull();
    expect(findNextTile(rects, 2, "left")).toBeNull();
    expect(findNextTile(rects, 6, "right")).toBeNull();
    expect(findNextTile(rects, 8, "right")).toBeNull();
  });

  it("treats slightly misaligned tiles as the same column", () => {
    const jittered: Rect[] = [rect(0, 0, 100), { ...rect(1, 0, 100), left: 112 }, { ...rect(1, 110, 100), left: 110 }];
    expect(findNextTile(jittered, 0, "right")).toBe(1);
  });

  it("returns null for an unknown index", () => {
    expect(findNextTile(rects, 99, "down")).toBeNull();
  });
});
