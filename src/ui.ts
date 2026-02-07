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
      '<p class="text-sm opacity-60">Add a box to start.</p>';
    return;
  }

  container.innerHTML = boxes
    .map(
      (box, index) => `
      <div class="tech-box-item flex items-center justify-between">
        <div class="flex items-center gap-2">
          ${oversizedBoxes?.has(index) ? '<span title="Panels exceed board size">&#9888;</span>' : ''}
          <span class="font-medium">${escapeHtml(box.name)}</span>
          <span class="opacity-60">
            ${box.width} × ${box.depth} × ${box.height}
          </span>
        </div>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-1 text-xs uppercase">
            Qty:
            <input
              type="number"
              data-index="${index}"
              value="${box.quantity}"
              min="1"
              class="quantity-input tech-input w-14 text-center"
            />
          </label>
          <button
            data-index="${index}"
            class="remove-box-btn tech-remove"
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
        <h3 class="text-xs uppercase tracking-wide font-semibold mb-3 border-b border-current pb-1">${escapeHtml(boxName)}</h3>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-current">
              <th class="text-left py-1 text-xs uppercase tracking-wide font-normal">Panel</th>
              <th class="text-left py-1 text-xs uppercase tracking-wide font-normal">Size (mm)</th>
              <th class="text-left py-1 text-xs uppercase tracking-wide font-normal">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${boxPanels
              .map(
                (panel) => `
              <tr class="border-b border-dashed border-gray-300">
                <td class="py-1">${escapeHtml(panel.label)}</td>
                <td class="py-1">${panel.width} × ${panel.height}</td>
                <td class="py-1">${panel.quantity}</td>
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

// Colors and hatch patterns for technical drawing look
const PANEL_COLORS = [
  "#2563eb", // blue
  "#16a34a", // green
  "#dc2626", // red
  "#9333ea", // purple
  "#ea580c", // orange
  "#0891b2", // cyan
  "#c026d3", // fuchsia
  "#854d0e", // amber
];

const HATCH_ANGLES = [45, -45, 0, 90, 30, -30, 60, -60];

function getPanelStyle(index: number): { color: string; angle: number } {
  return {
    color: PANEL_COLORS[index % PANEL_COLORS.length],
    angle: HATCH_ANGLES[index % HATCH_ANGLES.length],
  };
}

export function renderBoardInfo(config: BoardConfig, container: HTMLElement): void {
  const usable = getUsableArea(config);

  container.innerHTML = `
    <div class="border border-current p-3 text-sm">
      <p class="text-xs uppercase tracking-wide font-semibold mb-2">Board Configuration</p>
      <ul class="space-y-1 text-sm">
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
    <div class="border-2 border-current p-3 text-sm mb-4">
      <p class="text-xs uppercase tracking-wide font-semibold mb-2">⚠ Warnings</p>
      <ul class="space-y-1 list-disc list-inside">
        ${warnings}
      </ul>
    </div>
  `;
}

export function renderBoardVisualization(result: PackingResult, container: HTMLElement): void {
  if (result.boards.length === 0) {
    container.innerHTML = '<p class="text-sm opacity-60">No panels to display.</p>';
    return;
  }

  const config = result.config;

  // Scale factor: fit board to max 600px width
  const maxWidth = 600;
  const scale = Math.min(1, maxWidth / config.width);
  const svgWidth = config.width * scale;
  const svgHeight = config.height * scale;

  // Create a pattern index map for unique panel labels
  const labelPatternMap = new Map<string, number>();
  let patternIndex = 0;
  for (const board of result.boards) {
    for (const placement of board.placements) {
      const key = `${placement.panel.boxName}:${placement.panel.label}`;
      if (!labelPatternMap.has(key)) {
        labelPatternMap.set(key, patternIndex++);
      }
    }
  }

  // Generate hatch pattern definitions
  const patternDefs = Array.from(labelPatternMap.entries()).map(([, idx]) => {
    const style = getPanelStyle(idx);
    const patternId = `hatch-${idx}`;
    const spacing = 10;
    return `
      <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="${spacing}" height="${spacing}" patternTransform="rotate(${style.angle})">
        <line x1="0" y1="0" x2="0" y2="${spacing}" stroke="${style.color}" stroke-width="0.5" stroke-opacity="0.3" />
      </pattern>
    `;
  }).join("");

  // Summary
  let html = `
    <div class="border p-3 mb-4 text-sm">
      <span class="text-xs uppercase tracking-wide">Total boards needed:</span>
      <span class="font-bold ml-2">${result.boards.length}</span>
    </div>
  `;

  for (const board of result.boards) {
    html += `
      <div class="p-3 mb-4">
        <div class="mb-2 text-xs uppercase tracking-wide">
          Board ${board.id}
        </div>
        <svg
          width="${svgWidth}"
          height="${svgHeight}"
          viewBox="0 0 ${config.width} ${config.height}"
          class="bg-white"
        >
          <defs>
            ${patternDefs}
          </defs>
          <!-- Board outline -->
          <rect x="0" y="0" width="${config.width}" height="${config.height}" fill="none" stroke="#1a1a1a" stroke-width="2" />
          <!-- Margin area (dashed) -->
          <rect x="${config.margin}" y="${config.margin}" width="${config.width - 2 * config.margin}" height="${config.height - 2 * config.margin}" fill="none" stroke="#1a1a1a" stroke-width="0.5" stroke-dasharray="4 2" />
          <!-- Placed panels -->
          ${board.placements
            .map((placement) => renderPlacedPanel(placement, config.margin, labelPatternMap))
            .join("")}
        </svg>
      </div>
    `;
  }

  container.innerHTML = html;
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  if (text.length <= maxCharsPerLine) {
    return [text];
  }

  const lines: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxCharsPerLine) {
      lines.push(remaining);
      break;
    }

    // Try to break at a sensible point (space, dot, hyphen)
    let breakPoint = maxCharsPerLine;
    const searchArea = remaining.slice(0, maxCharsPerLine);
    const lastSpace = searchArea.lastIndexOf(' ');
    const lastDot = searchArea.lastIndexOf('.');
    const lastHyphen = searchArea.lastIndexOf('-');

    const bestBreak = Math.max(lastSpace, lastDot + 1, lastHyphen + 1);
    if (bestBreak > maxCharsPerLine * 0.4) {
      breakPoint = bestBreak;
    }

    lines.push(remaining.slice(0, breakPoint).trim());
    remaining = remaining.slice(breakPoint).trim();
  }

  return lines;
}

function renderPlacedPanel(
  placement: PlacedPanel,
  margin: number,
  patternMap: Map<string, number>
): string {
  const { panel, x, y, rotated, instanceIndex } = placement;
  const w = rotated ? panel.height : panel.width;
  const h = rotated ? panel.width : panel.height;

  const key = `${panel.boxName}:${panel.label}`;
  const patternIdx = patternMap.get(key) ?? 0;
  const patternId = `hatch-${patternIdx}`;
  const style = getPanelStyle(patternIdx);

  // Calculate position including margin
  const px = margin + x;
  const py = margin + y;

  // Font size scaled for readability
  const fontSize = Math.min(11, Math.max(7, Math.min(w, h) * 0.12));
  const dimFontSize = Math.max(6, fontSize * 0.85);
  const lineHeight = fontSize * 1.2;

  // Create label: "BoxName.Side" format
  const baseLabelText = `${panel.boxName}.${panel.label}`;
  const labelText =
    panel.quantity > 1 ? `${baseLabelText} (${instanceIndex + 1})` : baseLabelText;

  // Wrap text to fit panel width (with padding)
  const padding = 6;
  const maxCharsPerLine = Math.floor((w - padding * 2) / (fontSize * 0.55));
  const lines = wrapText(labelText, maxCharsPerLine);

  // Limit lines to fit in panel height (with padding)
  const maxLines = Math.floor((h - padding * 2 - dimFontSize) / lineHeight);
  const displayLines = lines.slice(0, Math.max(1, maxLines));
  if (displayLines.length < lines.length) {
    const lastLine = displayLines[displayLines.length - 1];
    displayLines[displayLines.length - 1] = lastLine.slice(0, -1) + "…";
  }

  // Dimensions text (always show original panel dimensions, not rotated)
  const dimText = `${panel.width}×${panel.height}`;

  // Calculate vertical centering for text block
  const totalTextHeight = displayLines.length * lineHeight + dimFontSize;
  const textStartY = py + (h - totalTextHeight) / 2 + fontSize * 0.8;

  const labelTspans = displayLines.map((line, i) =>
    `<tspan x="${px + w / 2}" dy="${i === 0 ? 0 : lineHeight}">${escapeHtml(line)}</tspan>`
  ).join("");

  return `
    <g>
      <rect
        x="${px}"
        y="${py}"
        width="${w}"
        height="${h}"
        fill="white"
      />
      <rect
        x="${px}"
        y="${py}"
        width="${w}"
        height="${h}"
        fill="url(#${patternId})"
        stroke="${style.color}"
        stroke-width="1.5"
      />
      <text
        x="${px + w / 2}"
        y="${textStartY}"
        text-anchor="middle"
        font-size="${fontSize}"
        fill="#1a1a1a"
        font-family="ui-monospace, monospace"
      >${labelTspans}</text>
      <text
        x="${px + w / 2}"
        y="${textStartY + displayLines.length * lineHeight}"
        text-anchor="middle"
        font-size="${dimFontSize}"
        fill="#4a4a4a"
        font-family="ui-monospace, monospace"
      >${dimText}</text>
    </g>
  `;
}
