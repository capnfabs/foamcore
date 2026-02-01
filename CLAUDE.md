# Foam Core Box Calculator

A web-based calculator for determining foam core panel dimensions for building boxes.

## Commands

- `npm run dev` - Start development server (Parcel)
- `npm run build` - Build for production (outputs to `dist/`)
- `npm test` - Run tests once (Vitest)
- `npm run test:watch` - Run tests in watch mode

## Architecture

- **Entry point**: `src/index.html` (Parcel source)
- **Core logic**: `src/calculator.ts` - Pure function `calculatePanels()` with no side effects
- **Types**: `src/types.ts` - BoxSpec, Panel, CalculationResult interfaces
- **UI**: `src/ui.ts` - DOM rendering functions
- **Main**: `src/index.ts` - Wires up UI events and service worker
- **Offline**: `src/service-worker.ts` - Uses @parcel/service-worker for caching

## Panel Calculation

For a box with dimensions W×D×H and material thickness T:
- **Front & Back** (2×): W × H
- **Left & Right Sides** (2×): (D - 2T) × H
- **Base** (1×): (W - 2T) × (D - 2T)

All dimensions are in millimeters. Default thickness is 5mm (standard foam core).

## Board Layout (Bin Packing)

The calculator includes a board layout optimizer using guillotine bin packing:

- **Packer**: `src/packer.ts` - Guillotine Best Area Fit algorithm
- **Board defaults**: 700×500mm board, 5mm edge margin, 1mm cut kerf
- **Usable area**: Board size minus margins (default 690×490mm)

### Algorithm
1. Expand panels by quantity into individual instances
2. Sort by area (largest first)
3. For each panel, find the best fitting free rectangle (smallest area that fits)
4. Allow 90° rotation if needed
5. Split remaining space using guillotine cuts
6. Create new boards as needed

### Types (in `src/types.ts`)
- `BoardConfig`: width, height, margin, kerf
- `PlacedPanel`: panel reference with x, y position and rotation flag
- `Board`: list of placements with efficiency percentage
- `PackingResult`: boards, unplaceable panels, and config
