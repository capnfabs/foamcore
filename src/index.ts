import { BoxSpec, BoardConfig } from "./types";
import { calculatePanels } from "./calculator";
import { packPanels, DEFAULT_BOARD_CONFIG, getUsableArea } from "./packer";
import {
  renderBoxList,
  renderPanelList,
  renderBoardWarnings,
  renderBoardVisualization,
  setTheme as setUiTheme,
} from "./ui";

// Storage
const BOXES_STORAGE_KEY = "foamcore-boxes";
const SETTINGS_STORAGE_KEY = "foamcore-settings";

type Theme = "technical" | "foamcore";

interface Settings {
  thickness: number;
  kerf: number;
  boardWidth: number;
  boardHeight: number;
  theme: Theme;
}

const DEFAULT_SETTINGS: Settings = {
  thickness: 5,
  kerf: 1,
  boardWidth: 700,
  boardHeight: 500,
  theme: "technical",
};

function saveBoxes(): void {
  localStorage.setItem(BOXES_STORAGE_KEY, JSON.stringify(boxes));
}

function loadBoxes(): BoxSpec[] {
  const stored = localStorage.getItem(BOXES_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    // Migrate old data without quantity field
    return parsed.map((box: BoxSpec) => ({
      ...box,
      quantity: box.quantity ?? 1,
    }));
  } catch {
    return [];
  }
}

function saveSettings(): void {
  const settings: Settings = {
    thickness: parseFloat(thicknessInput.value) || DEFAULT_SETTINGS.thickness,
    kerf: parseFloat(boardKerfInput.value) ?? DEFAULT_SETTINGS.kerf,
    boardWidth: parseFloat(boardWidthInput.value) || DEFAULT_SETTINGS.boardWidth,
    boardHeight: parseFloat(boardHeightInput.value) || DEFAULT_SETTINGS.boardHeight,
    theme: currentTheme,
  };
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function loadSettings(): Settings {
  const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!stored) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(stored);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Theme state
let currentTheme: Theme = DEFAULT_SETTINGS.theme;

function applyTheme(theme: Theme): void {
  currentTheme = theme;
  document.documentElement.dataset.theme = theme;
  setUiTheme(theme);
  updateThemeButtonText();
}

function updateThemeButtonText(): void {
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.textContent = currentTheme === "technical" ? "🤘 #foamcore 🤘" : "Technical Drawing";
  }
}

// Auto-name generation
function generateBoxName(index: number): string {
  let name = "";
  let n = index;
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Box ${name}`;
}

function getNextAutoName(): string {
  const pattern = /^Box ([A-Z]+)$/;
  let maxIndex = -1;
  for (const box of boxes) {
    const match = box.name.match(pattern);
    if (match) {
      let index = 0;
      for (const char of match[1]) {
        index = index * 26 + (char.charCodeAt(0) - 64);
      }
      maxIndex = Math.max(maxIndex, index);
    }
  }
  return generateBoxName(maxIndex + 1);
}

// Board config helpers
function getCurrentBoardConfig(): BoardConfig {
  return {
    width: parseFloat(boardWidthInput.value) || DEFAULT_BOARD_CONFIG.width,
    height: parseFloat(boardHeightInput.value) || DEFAULT_BOARD_CONFIG.height,
    margin: DEFAULT_BOARD_CONFIG.margin,
    kerf: parseFloat(boardKerfInput.value) ?? DEFAULT_BOARD_CONFIG.kerf,
  };
}

function wouldCreateOversizedPanels(box: BoxSpec): boolean {
  const config = getCurrentBoardConfig();
  const usable = getUsableArea(config);
  const thickness = parseFloat(thicknessInput.value) || 5;

  const panelDims = [
    { w: box.width, h: box.height },
    { w: box.depth - 2 * thickness, h: box.height },
    { w: box.width - 2 * thickness, h: box.depth - 2 * thickness },
  ];

  return panelDims.some(({ w, h }) => {
    const fitsNormal = w <= usable.width && h <= usable.height;
    const fitsRotated = h <= usable.width && w <= usable.height;
    return !fitsNormal && !fitsRotated;
  });
}

function getOversizedBoxes(): Set<number> {
  const oversized = new Set<number>();
  boxes.forEach((box, i) => {
    if (wouldCreateOversizedPanels(box)) oversized.add(i);
  });
  return oversized;
}

// State
const boxes: BoxSpec[] = loadBoxes();

// DOM elements
const thicknessInput = document.getElementById("thickness") as HTMLInputElement;
const boxNameInput = document.getElementById("box-name") as HTMLInputElement;
const boxWidthInput = document.getElementById("box-width") as HTMLInputElement;
const boxDepthInput = document.getElementById("box-depth") as HTMLInputElement;
const boxHeightInput = document.getElementById(
  "box-height"
) as HTMLInputElement;
const addBoxBtn = document.getElementById("add-box-btn") as HTMLButtonElement;
const openAddBoxBtn = document.getElementById("open-add-box-btn") as HTMLButtonElement;
const cancelAddBoxBtn = document.getElementById("cancel-add-box-btn") as HTMLButtonElement;
const addBoxDialog = document.getElementById("add-box-dialog") as HTMLDialogElement;
const boxListContainer = document.getElementById("box-list") as HTMLElement;
const resultsSection = document.getElementById("results") as HTMLElement;
const panelListContainer = document.getElementById("panel-list") as HTMLElement;

// Board settings elements
const boardWidthInput = document.getElementById("board-width") as HTMLInputElement;
const boardHeightInput = document.getElementById("board-height") as HTMLInputElement;
const boardKerfInput = document.getElementById("board-kerf") as HTMLInputElement;
const boardLayoutSection = document.getElementById("board-layout") as HTMLElement;
const boardWarningsContainer = document.getElementById("board-warnings") as HTMLElement;
const boardVisualizationContainer = document.getElementById("board-visualization") as HTMLElement;

// Theme toggle
const themeToggleBtn = document.getElementById("theme-toggle") as HTMLButtonElement;

// Add box function
function addBox(): void {
  let name = boxNameInput.value.trim();
  const width = parseFloat(boxWidthInput.value);
  const depth = parseFloat(boxDepthInput.value);
  const height = parseFloat(boxHeightInput.value);

  if (isNaN(width) || isNaN(depth) || isNaN(height)) {
    alert("Please fill in all dimension fields with valid values.");
    return;
  }

  if (width <= 0 || depth <= 0 || height <= 0) {
    alert("Dimensions must be positive numbers.");
    return;
  }

  // Auto-generate name if empty
  if (!name) {
    name = getNextAutoName();
  }

  const newBox: BoxSpec = { name, width, depth, height, quantity: 1 };

  // Check for oversized panels
  if (wouldCreateOversizedPanels(newBox)) {
    const config = getCurrentBoardConfig();
    const usable = getUsableArea(config);
    alert(
      `This box would create panels that exceed the usable board area (${usable.width} × ${usable.height} mm). ` +
        `Please use a larger board or smaller box dimensions.`
    );
    return;
  }

  boxes.push(newBox);
  saveBoxes();

  // Clear form (but keep height)
  boxNameInput.value = "";
  boxWidthInput.value = "";
  boxDepthInput.value = "";

  addBoxDialog.close();
  updateBoxList();
  recalculate();
}

// Event handlers
openAddBoxBtn.addEventListener("click", () => addBoxDialog.showModal());
cancelAddBoxBtn.addEventListener("click", () => addBoxDialog.close());
addBoxBtn.addEventListener("click", addBox);

// Theme toggle handler
themeToggleBtn.addEventListener("click", () => {
  const newTheme: Theme = currentTheme === "technical" ? "foamcore" : "technical";
  applyTheme(newTheme);
  saveSettings();
  recalculate(); // Re-render board visualization with new theme colors
});

// Enter key support for all input fields
[boxNameInput, boxWidthInput, boxDepthInput, boxHeightInput].forEach((input) => {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addBox();
    }
  });
});

// Recalculate panels and board layout
function recalculate(): void {
  if (boxes.length === 0) {
    resultsSection.classList.add("hidden");
    boardLayoutSection.classList.add("hidden");
    return;
  }

  const thickness = parseFloat(thicknessInput.value);
  if (isNaN(thickness) || thickness <= 0) {
    return;
  }

  const boardConfig: BoardConfig = {
    width: parseFloat(boardWidthInput.value) || DEFAULT_BOARD_CONFIG.width,
    height: parseFloat(boardHeightInput.value) || DEFAULT_BOARD_CONFIG.height,
    margin: DEFAULT_BOARD_CONFIG.margin,
    kerf: parseFloat(boardKerfInput.value) ?? DEFAULT_BOARD_CONFIG.kerf,
  };

  if (boardConfig.width <= 0 || boardConfig.height <= 0 || boardConfig.kerf < 0) {
    return;
  }

  const panels = calculatePanels(boxes, thickness);
  renderPanelList(panels, thickness, panelListContainer);
  resultsSection.classList.remove("hidden");

  const packingResult = packPanels(panels, boardConfig);
  renderBoardWarnings(packingResult, boardWarningsContainer);
  renderBoardVisualization(packingResult, boardVisualizationContainer);
  boardLayoutSection.classList.remove("hidden");
}

// Settings change listeners
boardWidthInput.addEventListener("input", () => { saveSettings(); updateBoxList(); recalculate(); });
boardHeightInput.addEventListener("input", () => { saveSettings(); updateBoxList(); recalculate(); });
boardKerfInput.addEventListener("input", () => { saveSettings(); recalculate(); });
thicknessInput.addEventListener("input", () => { saveSettings(); updateBoxList(); recalculate(); });

function updateBoxList(): void {
  const oversizedBoxes = getOversizedBoxes();
  renderBoxList(
    boxes,
    boxListContainer,
    (index) => {
      boxes.splice(index, 1);
      saveBoxes();
      updateBoxList();
      recalculate();
    },
    (index, quantity) => {
      boxes[index].quantity = quantity;
      saveBoxes();
      recalculate();
    },
    oversizedBoxes
  );
}

// Load settings from storage
const savedSettings = loadSettings();
thicknessInput.value = String(savedSettings.thickness);
boardKerfInput.value = String(savedSettings.kerf);
boardWidthInput.value = String(savedSettings.boardWidth);
boardHeightInput.value = String(savedSettings.boardHeight);

// Apply saved theme
applyTheme(savedSettings.theme);

// Render any boxes loaded from storage and calculate
updateBoxList();
recalculate();

// Register service worker (production only)
if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  navigator.serviceWorker.register(new URL("service-worker.ts", import.meta.url), {
    type: "module",
  });
}
