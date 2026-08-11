# Favarge Gardening

A React and TypeScript app for planning vegetable placement in the Favarge garden.

## Goals

- Plan garden beds, crops, and planting schedules.
- Track tasks across seasons.
- Keep notes on varieties, harvests, and observations.
- Suggest vegetable placement on the measured garden map.
- Support companion planting, watering guidance, crop rotation, and irrigation planning over time.

## Current Status

- Garden map uses the measured SVG drawing as the geometry source.
- Drawing scale is modeled as 1 drawing mm = 50 real mm.
- White rectangles are planting beds.
- Green areas are direct-access / no-plant zones.
- Garden name, bed names, bed sun exposure, and path/access names can be edited from the sidebar.
- Garden definitions can be reset, started blank, manually edited, or imported from an SVG file.
- Beds can be moved and resized directly on the map.
- Crop blocks can be suggested, moved, selected, and locked.
- Crop movement and resizing are constrained to the assigned bed.
- Crop block sizes are derived from crop spacing requirements in centimeters.
- Small crops can be grouped into planting blocks with multiple plant markers.
- Unlocked crop blocks can be resized, updating plant count from the spacing grid.
- Map view supports basic pan, zoom, and reset controls.
- Draft placements are stored locally in the browser.
- Open project problems are tracked in `PROJECT_PROBLEM_LIST.md`.

## Development

Install dependencies:

```powershell
npm install
```

Start the local development server:

```powershell
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

## Quality Checks

Format files:

```powershell
npm run format
```

Check formatting:

```powershell
npm run format:check
```

Run linting:

```powershell
npm run lint
```

Run tests:

```powershell
npm run test
```

Run tests in watch mode:

```powershell
npm run test:watch
```

Build for production:

```powershell
npm run build
```
