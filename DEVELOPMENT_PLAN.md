# Favarge Gardening Development Plan

## Product Vision

Favarge Gardening is a garden planning app for Switzerland-based growing seasons. The core experience is an editable map of the real garden where the user can request vegetables, receive placement suggestions, adjust the layout manually, lock decisions, and use weather-aware guidance during the season.

## Core User Workflows

1. Define the garden
   - Import or recreate the measured garden drawing.
   - Define beds, paths, borders, fixed objects, shade zones, water access, and usable planting areas.
   - Store garden dimensions in real units.

2. Request vegetables
   - Select required vegetables and quantities.
   - Optionally set constraints such as preferred varieties, expected household consumption, planting dates, and organic methods.
   - Let the app estimate required area and number of plants.

3. Generate a planting proposal
   - Suggest bed locations based on space, sun, crop family, companion rules, watering needs, rotation history, and spacing.
   - Show explanations for each placement.
   - Flag conflicts and weak choices.

4. Edit and lock the plan
   - Drag plants or blocks on the garden map.
   - Resize planting zones where appropriate.
   - Lock confirmed placements so later suggestions work around them.
   - Save plan versions by season and year.

5. Companion planting
   - Suggest good companions near selected crops.
   - Warn about poor companions.
   - Explain the reason: pests, nutrients, growth habit, shade, pollination, or harvest timing.

6. In-season care
   - Show watering needs per plant or bed.
   - Use MeteoSwiss data for temperature, precipitation, sunlight / radiation, and local forecasts.
   - Convert weather and crop data into practical watering recommendations.
   - Track completed watering and garden tasks.

7. Rotation planning
   - Track crop families by bed and year.
   - Suggest next-season placements that reduce disease and nutrient depletion risk.
   - Preserve locked fixed/perennial areas.

8. Irrigation layout planning
   - Model the existing drip watering system.
   - Let the user define drip head and spray head specifications.
   - Suggest where heads should be placed and how many are required.
   - Match irrigation coverage to crop water needs, bed geometry, pressure / flow constraints, and existing tubing routes.

## MVP Scope

The first useful version should focus on a single garden, one season, manual map editing, and explainable placement suggestions.

Included:

- Garden map editor with measured beds and paths.
- Vegetable catalog with spacing, crop family, water demand, sun need, and companion metadata.
- User-selected required vegetables.
- Basic placement suggestion engine.
- Drag, drop, resize, and lock planting blocks.
- Companion suggestions and conflict warnings.
- Local persistence.

Deferred:

- Full MeteoSwiss automation.
- Multi-year crop rotation optimization.
- Drip and spray irrigation layout planning.
- User accounts and sync.
- Mobile offline mode.
- Advanced yield planning.

## Technical Architecture

Recommended starting stack:

- Frontend: React + TypeScript.
- Map/editor: SVG or Canvas for 2D garden layout. Start with SVG for simpler hit testing, labels, and measured shapes.
- State: local app state with persisted JSON.
- Rules engine: TypeScript modules with deterministic scoring.
- Storage: local JSON first, SQLite later if the data model grows.
- Backend: defer until weather integration, sync, or multi-device use requires it.

The app should keep the planning engine separate from the UI:

- `garden-model`: beds, zones, dimensions, locked placements.
- `crop-catalog`: vegetables, spacing, families, companions, water needs.
- `planner-engine`: scoring, constraints, suggestions, explanations.
- `weather-service`: MeteoSwiss adapter and cached weather summaries.
- `rotation-service`: historical family occupancy and next-season recommendations.

## Data Model Draft

Garden:

- id
- name
- unit
- boundary polygon
- beds
- fixed objects
- sun zones
- water points

Bed:

- id
- name
- polygon
- soil notes
- sun exposure
- usable area

Crop:

- id
- common name
- botanical family
- spacing in row
- spacing between rows
- sun requirement
- water demand
- feeding demand
- planting windows
- harvest windows
- good companions
- bad companions

Placement:

- id
- crop id
- bed id
- geometry
- plant count
- locked
- season
- year
- notes

Irrigation Component:

- id
- type: drip head, spray head, tube, valve, connector, water source
- manufacturer / model
- flow rate
- spray radius or drip output
- pressure range
- geometry or location
- coverage pattern
- notes

Weather Summary:

- location
- date
- observed rain
- forecast rain
- temperature min/max
- sunshine or radiation
- watering adjustment

## Planning Engine

The first planner can be a transparent scoring system instead of an opaque optimizer.

Score inputs:

- available bed area
- required plant spacing
- sun compatibility
- water compatibility
- crop family rotation
- companion proximity
- bad companion distance
- locked placement conflicts
- path and border clearance

Output:

- suggested placements
- score per placement
- explanation text
- warnings
- alternative locations

This makes the app easier to debug and gives the user confidence in recommendations.

## MeteoSwiss Integration

MeteoSwiss Open Data is available for automated machine-readable downloads. Their current documentation says individual API queries are planned but not available before the end of 2026. The app should therefore isolate this behind a weather adapter.

Initial approach:

- Let the user configure garden location.
- Identify nearest relevant MeteoSwiss measurement / forecast data source.
- Download and cache official Open Data files.
- Use precipitation, temperature, and sunshine / radiation where available.
- Cite source as required: "Source: MeteoSwiss".

Watering logic should combine:

- crop baseline water need
- recent rain
- forecast rain
- temperature
- sunshine / radiation
- bed soil notes
- mulch setting
- user-confirmed watering history

## Irrigation Planning

The app should eventually convert plant water requirements and garden geometry into irrigation layout suggestions.

Inputs:

- bed geometry
- crop placement and water demand
- drip head and spray head specifications
- flow rate per head
- spray radius or drip output
- required pressure range
- water source location
- tube routing constraints
- existing irrigation components

Output:

- recommended drip / spray head count
- recommended head positions
- estimated coverage by bed and crop
- dry spots and overwatered areas
- total flow demand per irrigation zone
- warnings when the chosen hardware exceeds pressure or flow limits

This should remain a later-stage feature because it depends on accurate garden geometry, crop placement, hardware data, and real water source constraints.

## Development Phases

### Phase 0: Project Setup

- Finalize repository authentication and push the initial commit.
- Choose frontend tooling.
- Add linting, formatting, and test runner.
- Create project issue list.

### Phase 1: Garden Map Foundation

- Build a measured 2D garden canvas.
- Add garden beds, paths, and fixed objects.
- Support pan, zoom, select, edit, and save.
- Import the user's measured drawing as a reference layer.

### Phase 2: Crop Catalog

- Add seed crop data for common vegetables.
- Define spacing, family, water need, sun need, and companion rules.
- Build crop selection UI.

### Phase 3: Placement Planner

- Implement rule-based scoring.
- Generate initial vegetable placements.
- Explain why each crop was placed.
- Detect spacing and companion conflicts.

### Phase 4: Manual Editing

- Drag and resize crop blocks.
- Lock placements.
- Re-run suggestions around locked blocks.
- Save and load plan versions.

### Phase 5: Companion Planting

- Add companion suggestions around selected crops.
- Show positive and negative companion relationships.
- Support optional companion crops.

### Phase 6: Weather-Aware Watering

- Build MeteoSwiss data adapter.
- Cache weather data locally.
- Create daily watering recommendations by bed and crop.
- Add user confirmation of completed watering.

### Phase 7: Crop Rotation

- Track crop family history by bed and year.
- Add next-season recommendation mode.
- Warn about repeated family placement.
- Suggest rotation alternatives.

### Phase 8: Irrigation Layout Planning

- Add irrigation component catalog for drip heads, spray heads, tubing, valves, and connectors.
- Let the user enter manufacturer specifications or custom head data.
- Place existing water source and tubing routes on the garden map.
- Suggest head positions and quantities based on crop water needs and coverage.
- Estimate flow demand by zone.
- Warn about dry spots, overlaps, and pressure / flow conflicts.

## First Implementation Slice

The first build should create a working app shell with:

- A full-screen garden map as the main page.
- Hardcoded sample garden geometry.
- A small crop catalog.
- Crop request panel.
- Basic suggestion button.
- Movable and lockable crop blocks.
- JSON persistence.

This proves the core interaction before investing in weather, rotation, or a complex backend.

## Open Questions

- What frontend stack do we want: React, Vue, Svelte, or another framework?
- Should the first version be local-only or web-hosted?
- What format is the garden drawing: image, PDF, CAD, or hand sketch?
- What exact garden location should be used for MeteoSwiss data?
- Which vegetables are required for the first season?
- Should recommendations optimize for yield, low maintenance, companion planting, crop rotation, or visual layout first?

## Sources

- MeteoSwiss Open Data documentation: https://opendatadocs.meteoswiss.ch/
- MeteoSwiss local forecast data documentation: https://opendatadocs.meteoswiss.ch/e-forecast-data/e4-local-forecast-data
