import { describe, it, expect } from "vitest";
import { packPanels, getUsableArea, DEFAULT_BOARD_CONFIG } from "../src/packer";
import { Panel, BoardConfig } from "../src/types";

describe("getUsableArea", () => {
  it("calculates usable area with default config", () => {
    const usable = getUsableArea(DEFAULT_BOARD_CONFIG);
    expect(usable.width).toBe(690); // 700 - 2*5
    expect(usable.height).toBe(490); // 500 - 2*5
  });

  it("calculates usable area with custom config", () => {
    const config: BoardConfig = { width: 1000, height: 800, margin: 10, kerf: 2, thickness: 5 };
    const usable = getUsableArea(config);
    expect(usable.width).toBe(980); // 1000 - 2*10
    expect(usable.height).toBe(780); // 800 - 2*10
  });

  it("handles zero margin", () => {
    const config: BoardConfig = { width: 500, height: 500, margin: 0, kerf: 1, thickness: 5 };
    const usable = getUsableArea(config);
    expect(usable.width).toBe(500);
    expect(usable.height).toBe(500);
  });
});

describe("packPanels", () => {
  it("returns empty result for no panels", () => {
    const result = packPanels([]);
    expect(result.boards).toHaveLength(0);
    expect(result.unplaceable).toHaveLength(0);
  });

  it("places a single small panel on one board", () => {
    const panels: Panel[] = [
      { boxName: "Test", label: "Front", width: 100, height: 100, quantity: 1 },
    ];

    const result = packPanels(panels);

    expect(result.boards).toHaveLength(1);
    expect(result.boards[0].placements).toHaveLength(1);
    expect(result.boards[0].placements[0].x).toBe(0);
    expect(result.boards[0].placements[0].y).toBe(0);
    expect(result.boards[0].placements[0].rotated).toBe(false);
    expect(result.unplaceable).toHaveLength(0);
  });

  it("places 4x 200×200mm panels on a single 500×700 board", () => {
    const panels: Panel[] = [
      { boxName: "Test", label: "Square", width: 200, height: 200, quantity: 4 },
    ];

    const result = packPanels(panels);

    expect(result.boards).toHaveLength(1);
    expect(result.boards[0].placements).toHaveLength(4);
    expect(result.unplaceable).toHaveLength(0);
  });

  it("expands panels by quantity", () => {
    const panels: Panel[] = [
      { boxName: "Test", label: "Panel", width: 100, height: 100, quantity: 3 },
    ];

    const result = packPanels(panels);

    // All 3 instances should be placed
    const totalPlacements = result.boards.reduce(
      (sum, board) => sum + board.placements.length,
      0
    );
    expect(totalPlacements).toBe(3);

    // Verify instance indices
    const instances = result.boards.flatMap((b) =>
      b.placements.map((p) => p.instanceIndex)
    );
    expect(instances.sort()).toEqual([0, 1, 2]);
  });

  it("reports panel too large for board", () => {
    const panels: Panel[] = [
      { boxName: "Test", label: "Huge", width: 600, height: 400, quantity: 1 },
    ];

    // Usable area is 690×490, so 600×400 should fit
    const result = packPanels(panels);
    expect(result.unplaceable).toHaveLength(0);

    // But a truly huge panel won't fit
    const hugePanels: Panel[] = [
      { boxName: "Test", label: "Huge", width: 700, height: 500, quantity: 1 },
    ];

    const hugeResult = packPanels(hugePanels);
    expect(hugeResult.unplaceable).toHaveLength(1);
    expect(hugeResult.unplaceable[0].reason).toContain("exceeds usable area");
    expect(hugeResult.unplaceable[0].reason).toContain("Minimum board size needed");
  });

  it("rotates panels when needed to fit", () => {
    // Panel is 400×200, usable area is 690×490
    // If we have many of these, some might need rotation
    const panels: Panel[] = [
      { boxName: "Test", label: "Wide", width: 400, height: 150, quantity: 3 },
    ];

    const result = packPanels(panels);

    // All should fit
    expect(result.unplaceable).toHaveLength(0);
    const totalPlacements = result.boards.reduce(
      (sum, board) => sum + board.placements.length,
      0
    );
    expect(totalPlacements).toBe(3);
  });

  it("creates multiple boards when needed", () => {
    // 4 large panels that can't all fit on one board
    const panels: Panel[] = [
      { boxName: "Test", label: "Large", width: 400, height: 300, quantity: 4 },
    ];

    const result = packPanels(panels);

    // Should need multiple boards
    expect(result.boards.length).toBeGreaterThan(1);
    expect(result.unplaceable).toHaveLength(0);

    // All 4 should be placed
    const totalPlacements = result.boards.reduce(
      (sum, board) => sum + board.placements.length,
      0
    );
    expect(totalPlacements).toBe(4);
  });

  it("sorts panels by area (largest first)", () => {
    const panels: Panel[] = [
      { boxName: "Test", label: "Small", width: 50, height: 50, quantity: 1 },
      { boxName: "Test", label: "Large", width: 200, height: 200, quantity: 1 },
      { boxName: "Test", label: "Medium", width: 100, height: 100, quantity: 1 },
    ];

    const result = packPanels(panels);

    // The first placement should be the largest panel
    expect(result.boards[0].placements[0].panel.label).toBe("Large");
  });

  it("calculates board efficiency", () => {
    const panels: Panel[] = [
      { boxName: "Test", label: "Panel", width: 345, height: 245, quantity: 4 },
    ];

    const result = packPanels(panels);

    // Each board should have efficiency calculated
    for (const board of result.boards) {
      expect(board.efficiency).toBeGreaterThan(0);
      expect(board.efficiency).toBeLessThanOrEqual(100);
    }
  });

  it("uses custom board config", () => {
    const config: BoardConfig = { width: 300, height: 200, margin: 10, kerf: 2, thickness: 5 };
    const panels: Panel[] = [
      { boxName: "Test", label: "Panel", width: 100, height: 100, quantity: 1 },
    ];

    const result = packPanels(panels, config);

    expect(result.config).toEqual(config);
    expect(result.boards).toHaveLength(1);
  });

  it("handles multiple panel types from the same box", () => {
    const panels: Panel[] = [
      { boxName: "Box A", label: "Front & Back", width: 100, height: 50, quantity: 2 },
      { boxName: "Box A", label: "Left & Right", width: 70, height: 50, quantity: 2 },
      { boxName: "Box A", label: "Base", width: 90, height: 70, quantity: 1 },
    ];

    const result = packPanels(panels);

    // All 5 panel instances should be placed
    const totalPlacements = result.boards.reduce(
      (sum, board) => sum + board.placements.length,
      0
    );
    expect(totalPlacements).toBe(5);
    expect(result.unplaceable).toHaveLength(0);
  });

  it("handles zero kerf", () => {
    const config: BoardConfig = { width: 500, height: 500, margin: 0, kerf: 0, thickness: 5 };
    const panels: Panel[] = [
      { boxName: "Test", label: "Panel", width: 250, height: 250, quantity: 4 },
    ];

    const result = packPanels(panels, config);

    // With zero kerf and margin, 4x 250×250 panels should fit exactly on a 500×500 board
    expect(result.boards).toHaveLength(1);
    expect(result.boards[0].placements).toHaveLength(4);
  });

  it("assigns sequential board IDs", () => {
    const panels: Panel[] = [
      { boxName: "Test", label: "Large", width: 400, height: 300, quantity: 4 },
    ];

    const result = packPanels(panels);

    // Board IDs should be sequential starting from 1
    for (let i = 0; i < result.boards.length; i++) {
      expect(result.boards[i].id).toBe(i + 1);
    }
  });
});
