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
- Gray access zones are hard/permanent non-growing material access.
- Tan path zones are soft in-bed crop access made from wood chips, grass cuttings, or similar material.
- Garden name, bed names, bed sun exposure, and path/access names can be edited from the sidebar.
- Garden definitions can be reset, started blank, manually edited, imported from an SVG file, saved to JSON, and restored from JSON.
- Garden boundary can be moved, resized, and numerically edited in meters.
- Beds can be moved and resized directly on the map.
- Manual bed and path geometry edits are clamped inside the garden boundary.
- Garden definition editing can be locked to prevent accidental boundary, bed, or path changes while placing crops.
- Paths and access zones render above beds and use distinct colors by kind.
- Map includes a bottom-right real-world scale bar.
- Crop blocks can be suggested, moved, selected, and locked.
- Crop movement and resizing are constrained to the assigned bed.
- Crop requests show only selected crops instead of a full zero-filled catalog.
- Crop selection captures priority and rough intent; actual plant count comes from placed block size.
- Add Crop picker filters toward small-garden-suitable crops.
- Crop catalog includes projected yield and garden value factors, including rarity.
- The app suggests potential additional crops based on garden value, small-garden fit, and companion matches.
- Placement analysis summarizes actual placed plants, area, and projected yield.
- Sidebar uses Garden, Crops, and Analysis tabs to keep the workspace compact.
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

Python dependencies:

```powershell
pip install -r requirements.txt
```

`requirements.txt` is currently documentation-only because the app has no Python runtime dependencies.

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
