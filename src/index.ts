import { BoxSpec } from "./types";
import { calculatePanels } from "./calculator";
import { renderBoxList, renderPanelList } from "./ui";

// State
const boxes: BoxSpec[] = [];

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

  const panels = calculatePanels(boxes, thickness);
  renderPanelList(panels, thickness, panelListContainer);
  resultsSection.classList.remove("hidden");
});

function updateBoxList(): void {
  renderBoxList(boxes, boxListContainer, (index) => {
    boxes.splice(index, 1);
    updateBoxList();
    resultsSection.classList.add("hidden");
  });
}

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(new URL("service-worker.ts", import.meta.url), {
    type: "module",
  });
}
