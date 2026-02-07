import { Panel, BoardConfig, PlacedPanel, Board, PackingResult } from "./types";

export const DEFAULT_BOARD_CONFIG: BoardConfig = {
  width: 700,
  height: 500,
  margin: 5,
  kerf: 1,
  thickness: 5,
};

interface FreeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PanelInstance {
  panel: Panel;
  instanceIndex: number;
  width: number;
  height: number;
}

/**
 * Calculate usable area dimensions after accounting for margins
 */
export function getUsableArea(config: BoardConfig): { width: number; height: number } {
  return {
    width: config.width - 2 * config.margin,
    height: config.height - 2 * config.margin,
  };
}

/**
 * Expand panels by quantity into individual instances and sort by area (largest first)
 */
function expandAndSortPanels(panels: Panel[]): PanelInstance[] {
  const instances: PanelInstance[] = [];

  for (const panel of panels) {
    for (let i = 0; i < panel.quantity; i++) {
      instances.push({
        panel,
        instanceIndex: i,
        width: panel.width,
        height: panel.height,
      });
    }
  }

  // Sort by area descending (largest first)
  instances.sort((a, b) => b.width * b.height - a.width * a.height);

  return instances;
}

/**
 * Check if a panel fits in a free rectangle (with optional rotation)
 */
function tryFit(
  panelWidth: number,
  panelHeight: number,
  rect: FreeRect,
  kerf: number,
  isFirstInRect: boolean
): { fits: boolean; rotated: boolean; effectiveWidth: number; effectiveHeight: number } | null {
  // Add kerf to panel dimensions unless it's the first panel touching this edge
  const effectiveWidth = panelWidth + (isFirstInRect ? 0 : kerf);
  const effectiveHeight = panelHeight + (isFirstInRect ? 0 : kerf);

  // Try without rotation
  if (effectiveWidth <= rect.width && effectiveHeight <= rect.height) {
    return { fits: true, rotated: false, effectiveWidth, effectiveHeight };
  }

  // Try with rotation
  const rotatedEffectiveWidth = panelHeight + (isFirstInRect ? 0 : kerf);
  const rotatedEffectiveHeight = panelWidth + (isFirstInRect ? 0 : kerf);

  if (rotatedEffectiveWidth <= rect.width && rotatedEffectiveHeight <= rect.height) {
    return { fits: true, rotated: true, effectiveWidth: rotatedEffectiveWidth, effectiveHeight: rotatedEffectiveHeight };
  }

  return null;
}

/**
 * Split a free rectangle after placing a panel using guillotine cuts.
 * Returns new free rectangles created by the split.
 */
function guillotineSplit(
  rect: FreeRect,
  placedWidth: number,
  placedHeight: number,
  kerf: number
): FreeRect[] {
  const newRects: FreeRect[] = [];

  // Add kerf to create space between panels
  const usedWidth = placedWidth + kerf;
  const usedHeight = placedHeight + kerf;

  // Right rectangle (to the right of the placed panel)
  const rightWidth = rect.width - usedWidth;
  if (rightWidth > 0) {
    newRects.push({
      x: rect.x + usedWidth,
      y: rect.y,
      width: rightWidth,
      height: rect.height,
    });
  }

  // Bottom rectangle (below the placed panel)
  const bottomHeight = rect.height - usedHeight;
  if (bottomHeight > 0) {
    newRects.push({
      x: rect.x,
      y: rect.y + usedHeight,
      width: usedWidth - kerf, // Only as wide as the panel to avoid overlap
      height: bottomHeight,
    });
  }

  return newRects;
}

/**
 * Find the best free rectangle for a panel (smallest area that fits - Best Area Fit)
 */
function findBestFit(
  panelWidth: number,
  panelHeight: number,
  freeRects: FreeRect[],
  kerf: number
): { rectIndex: number; rotated: boolean; effectiveWidth: number; effectiveHeight: number } | null {
  let bestIndex = -1;
  let bestRotated = false;
  let bestArea = Infinity;
  let bestEffectiveWidth = 0;
  let bestEffectiveHeight = 0;

  for (let i = 0; i < freeRects.length; i++) {
    const rect = freeRects[i];
    // First panel in a rect doesn't need kerf on the edges touching the rect boundary
    const fit = tryFit(panelWidth, panelHeight, rect, kerf, true);

    if (fit && fit.fits) {
      const area = rect.width * rect.height;
      if (area < bestArea) {
        bestArea = area;
        bestIndex = i;
        bestRotated = fit.rotated;
        bestEffectiveWidth = fit.effectiveWidth;
        bestEffectiveHeight = fit.effectiveHeight;
      }
    }
  }

  if (bestIndex === -1) {
    return null;
  }

  return {
    rectIndex: bestIndex,
    rotated: bestRotated,
    effectiveWidth: bestEffectiveWidth,
    effectiveHeight: bestEffectiveHeight,
  };
}

/**
 * Calculate efficiency as percentage of usable area filled
 */
function calculateEfficiency(placements: PlacedPanel[], usableWidth: number, usableHeight: number): number {
  const usableArea = usableWidth * usableHeight;
  if (usableArea === 0) return 0;

  let filledArea = 0;
  for (const placement of placements) {
    const w = placement.rotated ? placement.panel.height : placement.panel.width;
    const h = placement.rotated ? placement.panel.width : placement.panel.height;
    filledArea += w * h;
  }

  return Math.round((filledArea / usableArea) * 100);
}

/**
 * Main packing function using guillotine best area fit algorithm
 */
export function packPanels(panels: Panel[], config: BoardConfig = DEFAULT_BOARD_CONFIG): PackingResult {
  const usable = getUsableArea(config);
  const instances = expandAndSortPanels(panels);
  const boards: Board[] = [];
  const unplaceable: PackingResult["unplaceable"] = [];

  // Track free rectangles for each board
  const boardFreeRects: FreeRect[][] = [];

  for (const instance of instances) {
    const { panel, instanceIndex, width, height } = instance;

    // Check if panel can fit on a board at all
    const fitsNormal = width <= usable.width && height <= usable.height;
    const fitsRotated = height <= usable.width && width <= usable.height;

    if (!fitsNormal && !fitsRotated) {
      const minWidth = width + 2 * config.margin;
      const minHeight = height + 2 * config.margin;
      unplaceable.push({
        panel,
        instanceIndex,
        reason: `Panel ${panel.label} (${width}×${height}mm) exceeds usable area (${usable.width}×${usable.height}mm). Minimum board size needed: ${minWidth}×${minHeight}mm`,
      });
      continue;
    }

    // Try to fit in existing boards
    let placed = false;

    for (let boardIdx = 0; boardIdx < boards.length; boardIdx++) {
      const freeRects = boardFreeRects[boardIdx];
      const fit = findBestFit(width, height, freeRects, config.kerf);

      if (fit) {
        const rect = freeRects[fit.rectIndex];
        const placedWidth = fit.rotated ? height : width;
        const placedHeight = fit.rotated ? width : height;

        // Place the panel
        boards[boardIdx].placements.push({
          panel,
          instanceIndex,
          x: rect.x,
          y: rect.y,
          rotated: fit.rotated,
        });

        // Remove the used rectangle and add new ones from the split
        freeRects.splice(fit.rectIndex, 1);
        const newRects = guillotineSplit(rect, placedWidth, placedHeight, config.kerf);
        freeRects.push(...newRects);

        placed = true;
        break;
      }
    }

    // Create a new board if needed
    if (!placed) {
      const newBoardId = boards.length + 1;
      const initialRect: FreeRect = {
        x: 0,
        y: 0,
        width: usable.width,
        height: usable.height,
      };

      // Determine if rotation is needed for initial placement
      let rotated = false;
      if (width > usable.width || height > usable.height) {
        rotated = true;
      }

      const placedWidth = rotated ? height : width;
      const placedHeight = rotated ? width : height;

      const newBoard: Board = {
        id: newBoardId,
        placements: [
          {
            panel,
            instanceIndex,
            x: 0,
            y: 0,
            rotated,
          },
        ],
        efficiency: 0, // Will be calculated at the end
      };

      boards.push(newBoard);

      // Create free rectangles from the split
      const newRects = guillotineSplit(initialRect, placedWidth, placedHeight, config.kerf);
      boardFreeRects.push(newRects);
    }
  }

  // Calculate efficiency for each board
  for (const board of boards) {
    board.efficiency = calculateEfficiency(board.placements, usable.width, usable.height);
  }

  return {
    boards,
    unplaceable,
    config,
  };
}
