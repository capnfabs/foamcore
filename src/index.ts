import { BoxSpec, BoardConfig } from "./types";
import { calculatePanels } from "./calculator";
import { packPanels, DEFAULT_BOARD_CONFIG, getUsableArea } from "./packer";
import {
  renderBoxList,
  renderPanelList,
  renderBoardWarnings,
  renderBoardVisualization,
} from "./ui";

// Storage
const STORAGE_KEY = "foamcore-boxes";

function saveBoxes(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(boxes));
}

function loadBoxes(): BoxSpec[] {
  const stored = localStorage.getItem(STORAGE_KEY);
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
const boxListContainer = document.getElementById("box-list") as HTMLElement;
const calculateBtn = document.getElementById(
  "calculate-btn"
) as HTMLButtonElement;
const resultsSection = document.getElementById("results") as HTMLElement;
const panelListContainer = document.getElementById("panel-list") as HTMLElement;

// Board settings elements
const boardWidthInput = document.getElementById("board-width") as HTMLInputElement;
const boardHeightInput = document.getElementById("board-height") as HTMLInputElement;
const boardKerfInput = document.getElementById("board-kerf") as HTMLInputElement;
const boardLayoutSection = document.getElementById("board-layout") as HTMLElement;
const boardWarningsContainer = document.getElementById("board-warnings") as HTMLElement;
const boardVisualizationContainer = document.getElementById("board-visualization") as HTMLElement;

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

  updateBoxList();
}

// Event handlers
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

// Board size change listeners (to update oversized warnings)
boardWidthInput.addEventListener("change", updateBoxList);
boardHeightInput.addEventListener("change", updateBoxList);
thicknessInput.addEventListener("change", updateBoxList);

calculateBtn.addEventListener("click", () => {
  if (boxes.length === 0) {
    alert("Please add at least one box.");
    return;
  }

  const thickness = parseFloat(thicknessInput.value);
  if (isNaN(thickness) || thickness <= 0) {
    alert("Please enter a valid thickness.");
    return;
  }

  // Get board config
  const boardConfig: BoardConfig = {
    width: parseFloat(boardWidthInput.value) || DEFAULT_BOARD_CONFIG.width,
    height: parseFloat(boardHeightInput.value) || DEFAULT_BOARD_CONFIG.height,
    margin: DEFAULT_BOARD_CONFIG.margin,
    kerf: parseFloat(boardKerfInput.value) ?? DEFAULT_BOARD_CONFIG.kerf,
  };

  // Validate board config
  if (boardConfig.width <= 0 || boardConfig.height <= 0) {
    alert("Board dimensions must be positive numbers.");
    return;
  }

  if (boardConfig.kerf < 0) {
    alert("Kerf must be non-negative.");
    return;
  }

  const panels = calculatePanels(boxes, thickness);
  renderPanelList(panels, thickness, panelListContainer);
  resultsSection.classList.remove("hidden");

  // Pack panels and render board layout
  const packingResult = packPanels(panels, boardConfig);
  renderBoardWarnings(packingResult, boardWarningsContainer);
  renderBoardVisualization(packingResult, boardVisualizationContainer);
  boardLayoutSection.classList.remove("hidden");
});

function updateBoxList(): void {
  const oversizedBoxes = getOversizedBoxes();
  renderBoxList(
    boxes,
    boxListContainer,
    (index) => {
      boxes.splice(index, 1);
      saveBoxes();
      updateBoxList();
      resultsSection.classList.add("hidden");
      boardLayoutSection.classList.add("hidden");
    },
    (index, quantity) => {
      boxes[index].quantity = quantity;
      saveBoxes();
      resultsSection.classList.add("hidden");
      boardLayoutSection.classList.add("hidden");
    },
    oversizedBoxes
  );
}

// Render any boxes loaded from storage
updateBoxList();

// Register service worker (production only)
if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  navigator.serviceWorker.register(new URL("service-worker.ts", import.meta.url), {
    type: "module",
  });
}
