import { PackingResult, PlacedPanel } from "./types";

export type EscapeFn = (text: string) => string;

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

    let breakPoint = maxCharsPerLine;
    const searchArea = remaining.slice(0, maxCharsPerLine);
    const lastSpace = searchArea.lastIndexOf(" ");
    const lastDot = searchArea.lastIndexOf(".");
    const lastHyphen = searchArea.lastIndexOf("-");

    const bestBreak = Math.max(lastSpace, lastDot + 1, lastHyphen + 1);
    if (bestBreak > maxCharsPerLine * 0.4) {
      breakPoint = bestBreak;
    }

    lines.push(remaining.slice(0, breakPoint).trim());
    remaining = remaining.slice(breakPoint).trim();
  }

  return lines;
}

function renderPlacedPanelSvg(
  placement: PlacedPanel,
  margin: number,
  patternMap: Map<string, number>,
  escape: EscapeFn
): string {
  const { panel, x, y, rotated, instanceIndex } = placement;
  const w = rotated ? panel.height : panel.width;
  const h = rotated ? panel.width : panel.height;

  const key = `${panel.boxName}:${panel.label}`;
  const patternIdx = patternMap.get(key) ?? 0;
  const patternId = `hatch-${patternIdx}`;
  const style = getPanelStyle(patternIdx);

  const px = margin + x;
  const py = margin + y;

  const fontSize = Math.min(11, Math.max(7, Math.min(w, h) * 0.12));
  const dimFontSize = Math.max(6, fontSize * 0.85);
  const lineHeight = fontSize * 1.2;

  const baseLabelText = `${panel.boxName}.${panel.label}`;
  const labelText =
    panel.quantity > 1 ? `${baseLabelText} (${instanceIndex + 1})` : baseLabelText;

  const padding = 6;
  const maxCharsPerLine = Math.floor((w - padding * 2) / (fontSize * 0.55));
  const lines = wrapText(labelText, maxCharsPerLine);

  const maxLines = Math.floor((h - padding * 2 - dimFontSize) / lineHeight);
  const displayLines = lines.slice(0, Math.max(1, maxLines));
  if (displayLines.length < lines.length) {
    const lastLine = displayLines[displayLines.length - 1];
    displayLines[displayLines.length - 1] = lastLine.slice(0, -1) + "…";
  }

  const dimText = `${panel.width}×${panel.height}`;

  const totalTextHeight = displayLines.length * lineHeight + dimFontSize;
  const textStartY = py + (h - totalTextHeight) / 2 + fontSize * 0.8;

  const labelTspans = displayLines
    .map(
      (line, i) =>
        `<tspan x="${px + w / 2}" dy="${i === 0 ? 0 : lineHeight}">${escape(line)}</tspan>`
    )
    .join("");

  return `
    <g>
      <rect x="${px}" y="${py}" width="${w}" height="${h}" fill="white" />
      <rect x="${px}" y="${py}" width="${w}" height="${h}" fill="url(#${patternId})" stroke="${style.color}" stroke-width="1.5" />
      <text x="${px + w / 2}" y="${textStartY}" text-anchor="middle" font-size="${fontSize}" fill="#1a1a1a" font-family="ui-monospace, monospace">${labelTspans}</text>
      <text x="${px + w / 2}" y="${textStartY + displayLines.length * lineHeight}" text-anchor="middle" font-size="${dimFontSize}" fill="#4a4a4a" font-family="ui-monospace, monospace">${dimText}</text>
    </g>
  `;
}

export function generateBoardSvg(
  result: PackingResult,
  boardIndex: number,
  escape: EscapeFn
): string {
  const board = result.boards[boardIndex];
  if (!board) {
    return "";
  }

  const config = result.config;

  // Create a pattern index map for unique panel labels
  const labelPatternMap = new Map<string, number>();
  let patternIndex = 0;
  for (const b of result.boards) {
    for (const placement of b.placements) {
      const key = `${placement.panel.boxName}:${placement.panel.label}`;
      if (!labelPatternMap.has(key)) {
        labelPatternMap.set(key, patternIndex++);
      }
    }
  }

  // Generate hatch pattern definitions
  const patternDefs = Array.from(labelPatternMap.entries())
    .map(([, idx]) => {
      const style = getPanelStyle(idx);
      const patternId = `hatch-${idx}`;
      const spacing = 10;
      return `<pattern id="${patternId}" patternUnits="userSpaceOnUse" width="${spacing}" height="${spacing}" patternTransform="rotate(${style.angle})">
        <line x1="0" y1="0" x2="0" y2="${spacing}" stroke="${style.color}" stroke-width="0.5" stroke-opacity="0.3" />
      </pattern>`;
    })
    .join("\n");

  const panelsSvg = board.placements
    .map((placement) => renderPlacedPanelSvg(placement, config.margin, labelPatternMap, escape))
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${config.width}" height="${config.height}" viewBox="0 0 ${config.width} ${config.height}">
  <defs>
    ${patternDefs}
  </defs>
  <rect x="0" y="0" width="${config.width}" height="${config.height}" fill="none" stroke="#1a1a1a" stroke-width="2" />
  <rect x="${config.margin}" y="${config.margin}" width="${config.width - 2 * config.margin}" height="${config.height - 2 * config.margin}" fill="none" stroke="#1a1a1a" stroke-width="0.5" stroke-dasharray="4 2" />
  ${panelsSvg}
</svg>`;
}

export function generateAllBoardsSvg(result: PackingResult, escape: EscapeFn): string[] {
  return result.boards.map((_, index) => generateBoardSvg(result, index, escape));
}
