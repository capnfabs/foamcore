import { BoxSpec, Panel } from "./types";

export function renderBoxList(
  boxes: BoxSpec[],
  container: HTMLElement,
  onRemove: (index: number) => void
): void {
  if (boxes.length === 0) {
    container.innerHTML =
      '<p class="text-gray-500 text-sm">No boxes added yet.</p>';
    return;
  }

  container.innerHTML = boxes
    .map(
      (box, index) => `
      <div class="flex items-center justify-between bg-gray-50 p-3 rounded-md">
        <div>
          <span class="font-medium">${escapeHtml(box.name)}</span>
          <span class="text-gray-500 text-sm ml-2">
            ${box.width} × ${box.depth} × ${box.height} mm
          </span>
        </div>
        <button
          data-index="${index}"
          class="remove-box-btn text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Remove
        </button>
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

  let html = `<p class="text-sm text-gray-600 mb-4">Material thickness: ${thickness}mm</p>`;

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
