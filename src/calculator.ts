import { BoxSpec, Panel } from "./types";

/**
 * Calculate all panels needed for the given boxes.
 *
 * For a box with dimensions W×D×H and material thickness T:
 * - Front & Back (2×): W × H
 * - Left & Right Sides (2×): (D - 2T) × H
 * - Base (1×): (W - 2T) × (D - 2T)
 *
 * Side panels are narrower because they slot between front/back.
 * The base fits inside all four walls.
 */
export function calculatePanels(boxes: BoxSpec[], thickness: number): Panel[] {
  const panels: Panel[] = [];

  for (const box of boxes) {
    const { name, width, depth, height, quantity = 1 } = box;

    // Front & Back: full width × height
    panels.push({
      boxName: name,
      label: "Front & Back",
      width: width,
      height: height,
      quantity: 2 * quantity,
    });

    // Left & Right Sides: depth minus front/back thickness on both sides
    panels.push({
      boxName: name,
      label: "Left & Right Sides",
      width: depth - 2 * thickness,
      height: height,
      quantity: 2 * quantity,
    });

    // Base: fits inside all four walls
    panels.push({
      boxName: name,
      label: "Base",
      width: width - 2 * thickness,
      height: depth - 2 * thickness,
      quantity: 1 * quantity,
    });
  }

  return panels;
}
