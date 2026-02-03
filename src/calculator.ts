import { BoxSpec, Panel } from "./types";

/**
 * Calculate all panels needed for the given boxes.
 *
 * For a box with dimensions W×D×H and material thickness T:
 * - Long or Short (2×): W × H (labeled based on which dimension is larger)
 * - Long or Short (2×): (D - 2T) × H (labeled based on which dimension is larger)
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
    const frontBackWidth = width;
    // Left & Right Sides: depth minus front/back thickness on both sides
    const sideWidth = depth - 2 * thickness;

    // Determine which panels are "Long" vs "Short" based on panel width
    const frontBackLabel = frontBackWidth >= sideWidth ? "Long" : "Short";
    const sideLabel = sideWidth > frontBackWidth ? "Long" : "Short";

    panels.push({
      boxName: name,
      label: frontBackLabel,
      width: frontBackWidth,
      height: height,
      quantity: 2 * quantity,
    });

    panels.push({
      boxName: name,
      label: sideLabel,
      width: sideWidth,
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
