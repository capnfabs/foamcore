import { BoxSpec, Panel, BoardConfig, PackingResult, PlacedPanel } from "./types";
import { getUsableArea } from "./packer";

export function renderBoxList(
  boxes: BoxSpec[],
  container: HTMLElement,
  onRemove: (index: number) => void,
  onQuantityChange?: (index: number, quantity: number) => void,
  oversizedBoxes?: Set<number>
): void {
  if (boxes.length === 0) {
    container.innerHTML =
      '<p class="text-gray-500 text-sm">Add a box to start.</p>';
    return;
  }

  container.innerHTML = boxes
    .map(
      (box, index) => `
      <div class="flex items-center justify-between bg-gray-50 p-3 rounded-md">
        <div class="flex items-center gap-2">
          ${oversizedBoxes?.has(index) ? '<span title="Panels exceed board size" class="text-amber-500">&#9888;</span>' : ''}
          <span class="font-medium">${escapeHtml(box.name)}</span>
          <span class="text-gray-500 text-sm">
            ${box.width} × ${box.depth} × ${box.height} mm
          </span>
        </div>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-1 text-sm text-gray-600">
            Qty:
            <input
              type="number"
              data-index="${index}"
              value="${box.quantity}"
              min="1"
              class="quantity-input w-14 px-2 py-1 border border-gray-300 rounded text-center"
            />
          </label>
          <button
            data-index="${index}"
            class="remove-box-btn text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Remove
          </button>
        </div>
      </div>
    `
    )
    .join("");

  container.querySelectorAll(".remove-box-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(
        (e.target as HTMLElement).dataset.index || "0",
        10
      );
      onRemove(index);
    });
  });

  if (onQuantityChange) {
    container.querySelectorAll(".quantity-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        const index = parseInt(target.dataset.index || "0", 10);
        const quantity = Math.max(1, parseInt(target.value, 10) || 1);
        target.value = String(quantity);
        onQuantityChange(index, quantity);
      });
    });
  }
}

export function renderPanelList(
  panels: Panel[],
  thickness: number,
  container: HTMLElement
): void {
  // Group panels by box name
  const grouped = new Map<string, Panel[]>();
  for (const panel of panels) {
    const existing = grouped.get(panel.boxName) || [];
    existing.push(panel);
    grouped.set(panel.boxName, existing);
  }

  let html = "";

  for (const [boxName, boxPanels] of grouped) {
    html += `
      <div class="mb-4">
        <h3 class="font-semibold text-gray-800 mb-2">${escapeHtml(boxName)}</h3>
        <table class="w-full text-sm">
          <thead class="bg-gray-100">
            <tr>
              <th class="text-left p-2">Panel</th>
              <th class="text-left p-2">Size (mm)</th>
              <th class="text-left p-2">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${boxPanels
              .map(
                (panel) => `
              <tr class="border-b border-gray-100">
                <td class="p-2">${escapeHtml(panel.label)}</td>
                <td class="p-2">${panel.width} × ${panel.height}</td>
                <td class="p-2">${panel.quantity}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  container.innerHTML = html;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Color palette for panels
const PANEL_COLORS = [
  "#93c5fd", // blue-300
  "#86efac", // green-300
  "#fcd34d", // amber-300
  "#f9a8d4", // pink-300
  "#c4b5fd", // violet-300
  "#fdba74", // orange-300
  "#67e8f9", // cyan-300
  "#fca5a5", // red-300
];

function getPanelColor(index: number): string {
  return PANEL_COLORS[index % PANEL_COLORS.length];
}

export function renderBoardInfo(config: BoardConfig, container: HTMLElement): void {
  const usable = getUsableArea(config);

  container.innerHTML = `
    <div class="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
      <p class="font-medium text-blue-800 mb-2">Board Configuration</p>
      <ul class="text-blue-700 space-y-1">
        <li>Board size: ${config.width} × ${config.height} mm</li>
        <li>Edge margin: ${config.margin}mm on each edge</li>
        <li>Usable area: ${usable.width} × ${usable.height} mm</li>
        <li>Cut kerf: ${config.kerf}mm between panels</li>
      </ul>
    </div>
  `;
}

export function renderBoardWarnings(result: PackingResult, container: HTMLElement): void {
  if (result.unplaceable.length === 0) {
    container.innerHTML = "";
    return;
  }

  const warnings = result.unplaceable.map(
    (item) => `<li>${escapeHtml(item.reason)}</li>`
  ).join("");

  container.innerHTML = `
    <div class="bg-red-50 border border-red-200 rounded-md p-3 text-sm">
      <p class="font-medium text-red-800 mb-2">Warnings</p>
      <ul class="text-red-700 space-y-1 list-disc list-inside">
        ${warnings}
      </ul>
    </div>
  `;
}

export function renderBoardVisualization(result: PackingResult, container: HTMLElement): void {
  if (result.boards.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-sm">No panels to display.</p>';
    return;
  }

  const config = result.config;

  // Scale factor: fit board to max 600px width
  const maxWidth = 600;
  const scale = Math.min(1, maxWidth / config.width);
  const svgWidth = config.width * scale;
  const svgHeight = config.height * scale;

  // Create a color map for unique panel labels
  const labelColorMap = new Map<string, string>();
  let colorIndex = 0;
  for (const board of result.boards) {
    for (const placement of board.placements) {
      const key = `${placement.panel.boxName}:${placement.panel.label}`;
      if (!labelColorMap.has(key)) {
        labelColorMap.set(key, getPanelColor(colorIndex++));
      }
    }
  }

  // Summary
  let html = `
    <div class="bg-gray-50 rounded-md p-3 mb-4 text-sm">
      <p class="font-medium text-gray-700">
        Total boards needed: <span class="text-blue-600">${result.boards.length}</span>
      </p>
    </div>
  `;

  for (const board of result.boards) {
    html += `
      <div class="border border-gray-200 rounded-md p-3">
        <div class="mb-2">
          <span class="font-medium text-gray-700">Board ${board.id}</span>
        </div>
        <svg
          width="${svgWidth}"
          height="${svgHeight}"
          viewBox="0 0 ${config.width} ${config.height}"
          class="border border-gray-300 bg-white"
        >
          <!-- Placed panels -->
          ${board.placements
            .map((placement) => renderPlacedPanel(placement, config.margin, labelColorMap))
            .join("")}
        </svg>
      </div>
    `;
  }

  container.innerHTML = html;
}

function renderPlacedPanel(
  placement: PlacedPanel,
  margin: number,
  colorMap: Map<string, string>
): string {
  const { panel, x, y, rotated, instanceIndex } = placement;
  const w = rotated ? panel.height : panel.width;
  const h = rotated ? panel.width : panel.height;

  const key = `${panel.boxName}:${panel.label}`;
  const color = colorMap.get(key) || "#e5e7eb";

  // Calculate position including margin
  const px = margin + x;
  const py = margin + y;

  // Font size scaled for readability
  const fontSize = Math.min(12, Math.max(8, Math.min(w, h) * 0.15));
  const dimFontSize = Math.max(6, fontSize * 0.85);

  // Create label: "BoxName.Side" format
  const baseLabelText = `${panel.boxName}.${panel.label}`;
  const labelText =
    panel.quantity > 1 ? `${baseLabelText} (${instanceIndex + 1})` : baseLabelText;

  // Truncate label if too long
  const maxChars = Math.floor(w / (fontSize * 0.6));
  const displayLabel = labelText.length > maxChars ? labelText.slice(0, maxChars - 1) + "…" : labelText;

  // Dimensions text (always show original panel dimensions, not rotated)
  const dimText = `${panel.width}×${panel.height}`;

  return `
    <g>
      <rect
        x="${px}"
        y="${py}"
        width="${w}"
        height="${h}"
        fill="${color}"
        stroke="#374151"
        stroke-width="1"
      />
      <text
        x="${px + w / 2}"
        y="${py + h / 2 - dimFontSize * 0.4}"
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="${fontSize}"
        fill="#1f2937"
        font-family="system-ui, sans-serif"
      >${escapeHtml(displayLabel)}</text>
      <text
        x="${px + w / 2}"
        y="${py + h / 2 + fontSize * 0.6}"
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="${dimFontSize}"
        fill="#4b5563"
        font-family="system-ui, sans-serif"
      >${dimText}</text>
    </g>
  `;
}

