export interface BoxSpec {
  name: string;
  width: number;  // mm
  depth: number;  // mm
  height: number; // mm
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
