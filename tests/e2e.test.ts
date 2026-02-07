import { describe, it, expect, vi } from "vitest";
import { calculatePanels } from "../src/calculator";
import { packPanels } from "../src/packer";
import { generateAllBoardsSvg } from "../src/svg";
import { BoxSpec, BoardConfig } from "../src/types";

// Simple escape function for testing (mirrors DOM-based escapeHtml behavior)
function escapeForTest(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

describe("end-to-end SVG generation", () => {
  it("generates consistent SVG for a single box", () => {
    const boxes: BoxSpec[] = [
      { name: "Small Box", width: 100, depth: 80, height: 50, quantity: 1 },
    ];
    const config: BoardConfig = {
      width: 700,
      height: 500,
      margin: 5,
      kerf: 1,
      thickness: 5,
    };

    const panels = calculatePanels(boxes, config.thickness);
    const packingResult = packPanels(panels, config);
    const svgs = generateAllBoardsSvg(packingResult, escapeForTest);

    expect(svgs).toHaveLength(1);
    expect(svgs[0]).toMatchSnapshot();
  });

  it("generates consistent SVG for multiple boxes", () => {
    const boxes: BoxSpec[] = [
      { name: "Box A", width: 150, depth: 100, height: 60, quantity: 1 },
      { name: "Box B", width: 80, depth: 80, height: 40, quantity: 2 },
    ];
    const config: BoardConfig = {
      width: 700,
      height: 500,
      margin: 5,
      kerf: 1,
      thickness: 5,
    };

    const panels = calculatePanels(boxes, config.thickness);
    const packingResult = packPanels(panels, config);
    const svgs = generateAllBoardsSvg(packingResult, escapeForTest);

    expect(svgs.length).toBeGreaterThan(0);
    svgs.forEach((svg, index) => {
      expect(svg).toMatchSnapshot(`board-${index + 1}`);
    });
  });

  it("generates consistent SVG requiring multiple boards", () => {
    const boxes: BoxSpec[] = [
      { name: "Large Box", width: 300, depth: 250, height: 200, quantity: 2 },
    ];
    const config: BoardConfig = {
      width: 700,
      height: 500,
      margin: 5,
      kerf: 1,
      thickness: 5,
    };

    const panels = calculatePanels(boxes, config.thickness);
    const packingResult = packPanels(panels, config);
    const svgs = generateAllBoardsSvg(packingResult, escapeForTest);

    expect(svgs.length).toBeGreaterThan(1);
    svgs.forEach((svg, index) => {
      expect(svg).toMatchSnapshot(`board-${index + 1}`);
    });
  });

  it("uses the escape function for box names with special characters", () => {
    const boxes: BoxSpec[] = [
      { name: "<script>alert('xss')</script>", width: 100, depth: 80, height: 50, quantity: 1 },
    ];
    const config: BoardConfig = {
      width: 700,
      height: 500,
      margin: 5,
      kerf: 1,
      thickness: 5,
    };

    const escapeSpy = vi.fn(escapeForTest);

    const panels = calculatePanels(boxes, config.thickness);
    const packingResult = packPanels(panels, config);
    const svgs = generateAllBoardsSvg(packingResult, escapeSpy);

    // Verify escape function was called
    expect(escapeSpy).toHaveBeenCalled();

    // Verify the raw dangerous string does NOT appear in output
    expect(svgs[0]).not.toContain("<script>");
    expect(svgs[0]).not.toContain("</script>");

    // Verify the escaped version DOES appear in output
    expect(svgs[0]).toContain("&lt;script&gt;");
  });
});
