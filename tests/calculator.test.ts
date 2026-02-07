import { describe, it, expect } from "vitest";
import { calculatePanels } from "../src/calculator";
import { BoxSpec } from "../src/types";

describe("calculatePanels", () => {
  it("calculates panels for a single box with standard thickness", () => {
    const boxes: BoxSpec[] = [{ name: "Test Box", width: 100, depth: 80, height: 50, quantity: 1 }];
    const thickness = 5;

    const panels = calculatePanels(boxes, thickness);

    expect(panels).toHaveLength(3);

    // Long panels (front/back): 100 × 50, qty 2 (width=100 > sideWidth=70)
    expect(panels[0]).toEqual({
      boxName: "Test Box",
      label: "Long",
      width: 100,
      height: 50,
      quantity: 2,
    });

    // Short panels (sides): (80 - 10) × 50 = 70 × 50, qty 2
    expect(panels[1]).toEqual({
      boxName: "Test Box",
      label: "Short",
      width: 70,
      height: 50,
      quantity: 2,
    });

    // Base: (100 - 10) × (80 - 10) = 90 × 70, qty 1
    expect(panels[2]).toEqual({
      boxName: "Test Box",
      label: "Base",
      width: 90,
      height: 70,
      quantity: 1,
    });
  });

  it("calculates panels for multiple boxes", () => {
    const boxes: BoxSpec[] = [
      { name: "Box A", width: 100, depth: 100, height: 100, quantity: 1 },
      { name: "Box B", width: 50, depth: 50, height: 30, quantity: 1 },
    ];
    const thickness = 5;

    const panels = calculatePanels(boxes, thickness);

    // 3 panel types per box = 6 total
    expect(panels).toHaveLength(6);

    // First box panels
    expect(panels[0].boxName).toBe("Box A");
    expect(panels[1].boxName).toBe("Box A");
    expect(panels[2].boxName).toBe("Box A");

    // Second box panels
    expect(panels[3].boxName).toBe("Box B");
    expect(panels[4].boxName).toBe("Box B");
    expect(panels[5].boxName).toBe("Box B");
  });

  it("handles zero thickness (theoretical case)", () => {
    const boxes: BoxSpec[] = [{ name: "Zero Thickness", width: 100, depth: 80, height: 50, quantity: 1 }];
    const thickness = 0;

    const panels = calculatePanels(boxes, thickness);

    // Front & Back: 100 × 50
    expect(panels[0].width).toBe(100);
    expect(panels[0].height).toBe(50);

    // Sides: same as depth when thickness is 0
    expect(panels[1].width).toBe(80);
    expect(panels[1].height).toBe(50);

    // Base: same as width × depth when thickness is 0
    expect(panels[2].width).toBe(100);
    expect(panels[2].height).toBe(80);
  });

  it("returns empty array for no boxes", () => {
    const panels = calculatePanels([], 5);
    expect(panels).toEqual([]);
  });

  it("handles fractional thickness", () => {
    const boxes: BoxSpec[] = [{ name: "Thin", width: 100, depth: 100, height: 100, quantity: 1 }];
    const thickness = 3.5;

    const panels = calculatePanels(boxes, thickness);

    // Sides: 100 - 2*3.5 = 93
    expect(panels[1].width).toBe(93);

    // Base: 93 × 93
    expect(panels[2].width).toBe(93);
    expect(panels[2].height).toBe(93);
  });

  it("preserves box names with special characters", () => {
    const boxes: BoxSpec[] = [{ name: "Box <with> \"special\" chars", width: 50, depth: 50, height: 50, quantity: 1 }];
    const thickness = 5;

    const panels = calculatePanels(boxes, thickness);

    expect(panels[0].boxName).toBe("Box <with> \"special\" chars");
  });
});
