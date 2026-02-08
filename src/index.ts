import { BoxSpec, BoardConfig } from "./types";
import { calculatePanels } from "./calculator";
import { packPanels, DEFAULT_BOARD_CONFIG, getUsableArea } from "./packer";
import {
  renderBoxList,
  renderPanelList,
  renderBoardWarnings,
  renderBoardVisualization,
  WARNING_ICON,
} from "./ui";
import { generateBoxName } from "./naming";

// Storage
const BOXES_STORAGE_KEY = "foamcore-boxes";
const SETTINGS_STORAGE_KEY = "foamcore-settings";

interface Settings {
  thickness: number;
  kerf: number;
  boardWidth: number;
  boardHeight: number;
}

const DEFAULT_SETTINGS: Settings = {
  thickness: 5,
  kerf: 1,
  boardWidth: 700,
  boardHeight: 500,
};

function saveBoxes(): void {
  localStorage.setItem(BOXES_STORAGE_KEY, JSON.stringify(boxes));
}

function loadBoxes(): BoxSpec[] {
  const stored = localStorage.getItem(BOXES_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    // bare minimum check that it's an array
    if (Array.isArray(parsed)) {
      return parsed as BoxSpec[];
    } else {
      return [];
    }
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
    thickness: parseFloat(thicknessInput.value) || DEFAULT_BOARD_CONFIG.thickness,
  };
}

function wouldCreateOversizedPanels(box: BoxSpec): boolean {
  const config = getCurrentBoardConfig();
  const usable = getUsableArea(config);

  const panelDims = [
    { w: box.width, h: box.height },
    { w: box.depth - 2 * config.thickness, h: box.height },
    { w: box.width - 2 * config.thickness, h: box.depth - 2 * config.thickness },
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
let editingIndex: number | null = null;

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
const addBoxDialogTitle = document.getElementById("add-box-dialog-title") as HTMLElement;
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
const addBoxWarning = document.getElementById("add-box-warning") as HTMLElement;


function validateDialogBox(): void {
  const width = parseFloat(boxWidthInput.value);
  const depth = parseFloat(boxDepthInput.value);
  const height = parseFloat(boxHeightInput.value);

  if (isNaN(width) || isNaN(depth) || isNaN(height) || width <= 0 || depth <= 0 || height <= 0) {
    addBoxWarning.classList.add("hidden");
    addBoxBtn.disabled = false;
    return;
  }

  const testBox: BoxSpec = { name: "", width, depth, height, quantity: 1 };
  if (wouldCreateOversizedPanels(testBox)) {
    const config = getCurrentBoardConfig();
    const usable = getUsableArea(config);
    addBoxWarning.innerHTML = `${WARNING_ICON} Panels exceed usable board area (${usable.width} \u00d7 ${usable.height} mm). Either make the box smaller, or change the board size in the settings.`;
    addBoxWarning.classList.remove("hidden");
    addBoxBtn.disabled = true;
  } else {
    addBoxWarning.classList.add("hidden");
    addBoxBtn.disabled = false;
  }
}

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

  if (editingIndex !== null) {
    const editedBox: BoxSpec = { name, width, depth, height, quantity: boxes[editingIndex].quantity };
    if (wouldCreateOversizedPanels(editedBox)) return;
    boxes[editingIndex] = editedBox;
    editingIndex = null;
  } else {
    const newBox: BoxSpec = { name, width, depth, height, quantity: 1 };
    if (wouldCreateOversizedPanels(newBox)) return;
    boxes.push(newBox);
  }

  saveBoxes();

  // Clear form (but keep height; it's super common to generate lots of boxes of the same height)
  boxNameInput.value = "";
  boxWidthInput.value = "";
  boxDepthInput.value = "";

  resetDialog();
  addBoxDialog.close();
  updateBoxList();
  recalculate();
}

function resetDialog(): void {
  editingIndex = null;
  addBoxDialogTitle.textContent = "Add Box";
  addBoxBtn.textContent = "Add";
  addBoxBtn.disabled = false;
  addBoxWarning.classList.add("hidden");
}

// Event handlers
openAddBoxBtn.addEventListener("click", () => {
  resetDialog();
  addBoxDialog.showModal();
});
cancelAddBoxBtn.addEventListener("click", () => {
  resetDialog();
  addBoxDialog.close();
});
addBoxDialog.addEventListener("close", () => resetDialog());
addBoxBtn.addEventListener("click", addBox);

// Enter key support for all input fields
[boxNameInput, boxWidthInput, boxDepthInput, boxHeightInput].forEach((input) => {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addBox();
    }
  });
});

// Real-time validation on dimension inputs
[boxWidthInput, boxDepthInput, boxHeightInput].forEach((input) => {
  input.addEventListener("input", validateDialogBox);
});

// Recalculate panels and board layout
function recalculate(): void {
  if (boxes.length === 0) {
    resultsSection.classList.add("hidden");
    boardLayoutSection.classList.add("hidden");
    return;
  }

  const boardConfig = getCurrentBoardConfig();

  if (boardConfig.thickness <= 0 || boardConfig.width <= 0 || boardConfig.height <= 0 || boardConfig.kerf < 0) {
    return;
  }

  const panels = calculatePanels(boxes, boardConfig.thickness);
  renderPanelList(panels, boardConfig.thickness, panelListContainer);
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
    oversizedBoxes,
    getCurrentBoardConfig(),
    (index) => {
      editingIndex = index;
      const box = boxes[index];
      boxNameInput.value = box.name;
      boxWidthInput.value = String(box.width);
      boxDepthInput.value = String(box.depth);
      boxHeightInput.value = String(box.height);
      addBoxDialogTitle.textContent = "Edit Box";
      addBoxBtn.textContent = "Save";
      addBoxDialog.showModal();
      validateDialogBox();
    }
  );
}

// Load settings from storage
const savedSettings = loadSettings();
thicknessInput.value = String(savedSettings.thickness);
boardKerfInput.value = String(savedSettings.kerf);
boardWidthInput.value = String(savedSettings.boardWidth);
boardHeightInput.value = String(savedSettings.boardHeight);

// Render any boxes loaded from storage and calculate
updateBoxList();
recalculate();

// Register service worker (production only)
if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  navigator.serviceWorker.register(new URL("service-worker.ts", import.meta.url), {
    type: "module",
  });
}
