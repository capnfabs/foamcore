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
