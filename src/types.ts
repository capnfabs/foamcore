export interface BoxSpec {
  name: string;
  width: number;  // mm
  depth: number;  // mm
  height: number; // mm
  quantity: number;
}

export interface Panel {
  boxName: string;
  label: string;   // e.g., "Front", "Back", "Left Side", "Right Side", "Base"
  width: number;   // mm
  height: number;  // mm
  quantity: number;
}

export interface CalculationResult {
  panels: Panel[];
  thickness: number; // mm - global setting
}

export interface BoardConfig {
  width: number;   // mm - default 700
  height: number;  // mm - default 500
  margin: number;  // mm - default 5
  kerf: number;    // mm - default 1
}

export interface PlacedPanel {
  panel: Panel;
  instanceIndex: number; // which instance of the panel (0-based)
  x: number;             // mm from left edge of usable area
  y: number;             // mm from top edge of usable area
  rotated: boolean;      // true if rotated 90°
}

export interface Board {
  id: number;
  placements: PlacedPanel[];
  efficiency: number; // percentage of usable area filled (0-100)
}

export interface PackingResult {
  boards: Board[];
  unplaceable: Array<{ panel: Panel; instanceIndex: number; reason: string }>;
  config: BoardConfig;
}
