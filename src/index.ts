import { BoxSpec, BoardConfig } from "./types";
import { calculatePanels } from "./calculator";
import { packPanels, DEFAULT_BOARD_CONFIG } from "./packer";
import {
  renderBoxList,
  renderPanelList,
  renderBoardInfo,
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
    return JSON.parse(stored);
  } catch {
    return [];
  }
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
const boardMarginInput = document.getElementById("board-margin") as HTMLInputElement;
const boardKerfInput = document.getElementById("board-kerf") as HTMLInputElement;
const boardLayoutSection = document.getElementById("board-layout") as HTMLElement;
const boardInfoContainer = document.getElementById("board-info") as HTMLElement;
const boardWarningsContainer = document.getElementById("board-warnings") as HTMLElement;
const boardVisualizationContainer = document.getElementById("board-visualization") as HTMLElement;

// Event handlers
addBoxBtn.addEventListener("click", () => {
  const name = boxNameInput.value.trim();
  const width = parseFloat(boxWidthInput.value);
  const depth = parseFloat(boxDepthInput.value);
  const height = parseFloat(boxHeightInput.value);

  if (!name || isNaN(width) || isNaN(depth) || isNaN(height)) {
    alert("Please fill in all fields with valid values.");
    return;
  }

  if (width <= 0 || depth <= 0 || height <= 0) {
    alert("Dimensions must be positive numbers.");
    return;
  }

  boxes.push({ name, width, depth, height });
  saveBoxes();

  // Clear form
  boxNameInput.value = "";
  boxWidthInput.value = "";
  boxDepthInput.value = "";
  boxHeightInput.value = "";

  updateBoxList();
});

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
    margin: parseFloat(boardMarginInput.value) ?? DEFAULT_BOARD_CONFIG.margin,
    kerf: parseFloat(boardKerfInput.value) ?? DEFAULT_BOARD_CONFIG.kerf,
  };

  // Validate board config
  if (boardConfig.width <= 0 || boardConfig.height <= 0) {
    alert("Board dimensions must be positive numbers.");
    return;
  }

  if (boardConfig.margin < 0 || boardConfig.kerf < 0) {
    alert("Margin and kerf must be non-negative.");
    return;
  }

  const panels = calculatePanels(boxes, thickness);
  renderPanelList(panels, thickness, panelListContainer);
  resultsSection.classList.remove("hidden");

  // Pack panels and render board layout
  const packingResult = packPanels(panels, boardConfig);
  renderBoardInfo(boardConfig, boardInfoContainer);
  renderBoardWarnings(packingResult, boardWarningsContainer);
  renderBoardVisualization(packingResult, boardVisualizationContainer);
  boardLayoutSection.classList.remove("hidden");
});

function updateBoxList(): void {
  renderBoxList(boxes, boxListContainer, (index) => {
    boxes.splice(index, 1);
    saveBoxes();
    updateBoxList();
    resultsSection.classList.add("hidden");
    boardLayoutSection.classList.add("hidden");
  });
}

// Render any boxes loaded from storage
updateBoxList();

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(new URL("service-worker.ts", import.meta.url), {
    type: "module",
  });
}
