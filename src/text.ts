/**
 * Wrap text to fit within a maximum number of characters per line.
 * Tries to break at sensible points (spaces, dots, hyphens).
 */
export function wrapText(text: string, maxCharsPerLine: number): string[] {
  // Guard against infinite loop with tiny panels
  if (maxCharsPerLine <= 0) {
    return [text];
  }

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
