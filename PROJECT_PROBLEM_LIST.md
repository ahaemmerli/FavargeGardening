# Favarge Gardening Project Problem List

This file tracks open product, technical, data, and UX problems. The development plan describes the intended path; this list captures the unresolved questions and implementation risks that need decisions or fixes.

Status values:

- `Open`: not started
- `In progress`: being actively worked
- `Blocked`: needs an external decision or data
- `Done`: resolved

## P0 - Core MVP

### P0-001: Garden Geometry Must Become Explicit Data

Status: In progress

Problem:
The current app uses geometry copied from `favargemap.svg` into TypeScript constants. That is enough for the first prototype, but the measured garden should become structured garden data with dimensions, beds, access zones, and coordinate scaling.

Why it matters:
Placement, spacing, irrigation, and rotation logic need reliable dimensions instead of raw drawing coordinates.

Acceptance criteria:

- Garden beds are stored as structured data.
- Each bed has real-world dimensions in meters.
- SVG coordinate units can be converted to meters.
- Access zones are represented as no-plant areas.
- Tests cover the coordinate-to-meter conversion.

Resolution:
Added `src/garden.ts` with structured bed/access-zone geometry, 50x drawing-scale conversion helpers, view-box helpers, and unit tests. The corrected drawing now matches the expected lower-left bed dimensions.

### P0-002: Crop Blocks Need Real Spacing Logic

Status: Done

Problem:
Suggested crop blocks currently use rough visual rectangle sizes. The app needs plant spacing, row spacing, plant count, and usable area calculations.

Why it matters:
The planner cannot make useful vegetable recommendations without knowing how much space each crop needs.

Acceptance criteria:

- Crop catalog includes plant spacing and row spacing.
- User requests can represent plant count or desired harvest quantity.
- Planner estimates required area per crop.
- Suggestions fail gracefully when requested crops do not fit.
- Tests cover at least one crop that fits and one crop that does not fit.

Progress:
The starter crop catalog now includes in-row and between-row spacing in centimeters, and suggested rectangles derive from those spacing values. Small crops can be grouped into multi-plant blocks, and resizing a block updates row/column count from the spacing grid. Values are currently curated starter data with source notes; they still need a stronger import or verification workflow.

### P0-003: Manual Placements Can Leave Beds

Status: Done

Problem:
Crop blocks can currently be dragged around the full map bounds. They should snap to or remain inside valid bed areas unless the user intentionally moves them elsewhere.

Why it matters:
Invalid placements will make companion, watering, and rotation recommendations unreliable.

Acceptance criteria:

- Dragging constrains crop blocks to planting beds.
- App detects and warns about crop blocks outside beds.
- Locked invalid placements are visibly flagged.
- Tests cover placement validity checks.

Resolution:
Crop block resizing is constrained to the assigned bed. Crop block movement can cross between beds; the block is assigned to the bed under its center while dragging and clamped to a valid bed when needed.

### P0-004: Suggestions Need Explainable Scoring

Status: Done

Problem:
The current suggestion engine picks the first compatible bed. It needs a transparent score based on sun, spacing, companions, conflicts, water need, and locked placements.

Why it matters:
Users need to understand why the app recommends a placement and when a recommendation is weak.

Acceptance criteria:

- Each suggestion includes a score.
- Each suggestion includes positive and negative reasons.
- Bad companion conflicts reduce score.
- Locked placements are respected.
- Tests cover scoring changes for companion and conflict cases.

Progress:
Added first-pass placement analysis scores and findings. The app now reports sun mismatch warnings, bad companion conflicts, good companion matches, and crop overlap with hard access or soft path zones. Next step is using these findings to propose better alternatives, not only report issues.

## P1 - User Experience

### P1-001: Garden Map Needs Pan, Zoom, and Better Selection

Status: In progress

Problem:
The map is currently static except for crop dragging. The user needs map navigation and clearer selection behavior as the plan becomes more complex.

Acceptance criteria:

- User can pan and zoom the garden map.
- Selected crop remains visually distinct.
- Selection panel shows bed, crop, water need, and companion status.
- Mobile layout remains usable.

Progress:
Basic pan, zoom, reset controls, bed selection, direct bed move/resize, garden boundary move/resize, scale bar, garden-definition editing, blank garden creation, SVG import, and garden-definition JSON save/restore are implemented. Mobile interaction still needs refinement.

### P1-007: Path And Access Zones Need Direct Map Editing

Status: Open

Problem:
Beds can be moved and resized directly on the map, but path/access zones still require numeric geometry editing in the sidebar.

Acceptance criteria:

- User can move a path/access zone directly on the map.
- User can resize a path/access zone directly on the map.
- Edited path/access zones remain inside the garden boundary.
- Tests cover access-zone geometry clamping.

Resolution:
Path/access zones can be selected, dragged, and resized directly on the map. Pointer edits and numeric edits share the same garden-boundary clamping behavior. Hard `access` zones and soft in-bed `path` zones now render above beds with different colors.

### P1-002: Crop Request UI Needs Better Inputs

Status: Done

Problem:
The current plus/minus crop quantity UI is a prototype. It does not capture variety, count vs area, planting windows, or priority.

Acceptance criteria:

- User can set crop priority.
- User can choose plant count or area target.
- UI can handle more crops without becoming noisy.
- Requests can be saved and restored.

Resolution:
The fixed plus/minus list was replaced with selected crop requests, an Add Crop picker, crop priority, rough amount intent, and placement analysis. Actual plant counts now come from placed block sizes instead of request quantities. Named plan/version persistence remains tracked separately in P1-003.

### P1-003: Local Persistence Needs Plan Versions

Status: Open

Problem:
The app saves only one browser-local draft. It should support named plans, seasons, and years.

Acceptance criteria:

- User can save a named plan.
- User can load an existing plan.
- Plan includes season and year.
- Existing local draft migration is handled.

### P1-009: Succession Planting Needs Time-Aware Placements

Status: Open

Problem:
During the growing season the user will harvest or remove crops and replace them with follow-up crops. The planner currently treats the map as a single static layout, so it cannot distinguish two crops that conflict at the same time from two crops that use the same area in sequence.

Why it matters:
A small garden depends on reuse of space over time. The app needs a pick-and-plant workflow for cases like harvesting radish, lettuce, or peas and replacing them with a later crop.

Acceptance criteria:

- Placements can store planned planting, harvest, removal, and replacement windows.
- User can mark a crop block as harvested, removed, or replaced.
- A replacement crop can reuse the same area without being treated as an overlap conflict when active periods do not overlap.
- Analysis distinguishes current layout, future layout, and full-season plan.
- Suggestions can propose follow-up crops based on crop family, season, spacing, and remaining growing window.

## P1 - Data And Domain Knowledge

### P1-004: Crop Catalog Needs Sourceable Data

Status: Open

Problem:
The crop catalog is currently hand-written starter data. It needs reliable values for spacing, families, water needs, sun needs, planting windows, projected yield, garden value factors, rarity, and companion rules.

Acceptance criteria:

- Catalog has source notes for each domain field.
- At least 20 common vegetables are included.
- Projected yield estimates have source notes.
- Garden value factors can be reviewed and overridden by the user.
- Companion rules distinguish strong evidence, common practice, and weak anecdote.
- Tests validate required fields are present for every crop.

Progress:
The crop catalog is now a dedicated module with selected-crop requests, 29 representative Swiss organic seed crops, projected yield estimates, small-garden suitability, Swiss suitability, garden value factors including rarity, picker filters, and first-pass additional crop suggestions. The current values are local starter estimates; a sourceable catalog import/verification workflow remains open.

### P1-005: Companion Planting Rules Need Confidence Levels

Status: Open

Problem:
Companion planting advice can be inconsistent. The app should avoid presenting weak claims as facts.

Acceptance criteria:

- Companion rules include a confidence level.
- UI explains the reason for each companion recommendation.
- Bad companion warnings are separated from soft suggestions.

### P1-008: Interplanting Must Be Explicit, Not Generic Overlap

Status: Open

Problem:
Some companions, such as basil between tomato plants, should be allowed to share space. Arbitrary block overlap would make the plan invalid, so overlap needs to be modeled as intentional interplanting.

Acceptance criteria:

- Placement mode supports `standalone`, `interplant`, and `border`.
- Interplant placements reference a host placement.
- Companion rules can explicitly allow or disallow interplanting.
- Interplanting checks individual plant positions and minimum clearance.
- UI distinguishes interplanted crops from ordinary overlapping blocks.

### P1-006: MeteoSwiss Data Access Needs Adapter Design

Status: Open

Problem:
MeteoSwiss Open Data is file-based today, while individual API queries are planned later. The app needs a weather adapter that can support both.

Acceptance criteria:

- Weather service interface is defined.
- Adapter can return daily precipitation, min/max temperature, and sunshine/radiation when available.
- Data source attribution is included.
- Tests cover watering adjustment from weather summaries.

## P2 - Future Capabilities

### P2-001: Crop Rotation Requires Historical Bed Occupancy

Status: Open

Problem:
Rotation planning needs multi-year crop family history per bed.

Acceptance criteria:

- Plan data stores crop family by bed, season, and year.
- Planner warns when the same family repeats too soon.
- Next-season mode can suggest alternatives.

### P2-002: Irrigation Planning Requires Hardware Specifications

Status: Open

Problem:
Drip and spray head placement depends on flow rate, pressure, spray radius, drip output, tubing routes, and water source constraints.

Acceptance criteria:

- Irrigation component catalog exists.
- User can enter custom head specifications.
- App can estimate head count and coverage per bed.
- App warns about dry spots, overlap, pressure, and flow conflicts.

### P2-003: Hosting And Sync Strategy Is Undecided

Status: Open

Problem:
The app is currently local-only. Hosting, accounts, and sync are intentionally deferred but will affect storage and backend design.

Acceptance criteria:

- Decision recorded: local-only, hosted single-user, or multi-user.
- Storage approach is compatible with that decision.
- Sensitive location or garden data handling is documented.

## Process Problems

### PROC-001: GitHub Issues Are Not Yet Mirrored

Status: Open

Problem:
This file is the source problem list for now. If GitHub Issues become the working tracker, these items should be mirrored or migrated.

Acceptance criteria:

- Decision made on file-based tracking vs GitHub Issues.
- If GitHub Issues are used, each problem gets an issue number.
- This file links to the corresponding issues.
