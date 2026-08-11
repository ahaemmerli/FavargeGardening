import React from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Droplets,
  Home,
  Lock,
  LockOpen,
  RotateCcw,
  Sparkles,
  Sprout,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  clampRectSizeToBed,
  clampRectToBed,
  createAccessZone,
  createBed,
  createBlankGardenDefinition,
  createDefaultGardenDefinition,
  defaultGardenViewBox,
  getBedLabel,
  parseGardenDefinitionFromSvg,
  panViewBox,
  type GardenDefinition,
  type RectGeometry,
  type SunExposure,
  zoomViewBox,
} from "./garden";
import {
  createSuggestions,
  cropById,
  crops,
  describeWater,
  getBlockLayoutFromSize,
  getCropFootprint,
  getCompanionSummary,
  type CropId,
  type CropRequest,
  type Placement,
} from "./planner";

const storageKey = "favarge-gardening-plan-v1";
const gardenStorageKey = "favarge-gardening-definition-v1";

type ActiveMapInteraction =
  | { type: "move-placement"; id: string; dx: number; dy: number }
  | { type: "resize-placement"; id: string; startX: number; startY: number }
  | { type: "move-bed"; id: string; dx: number; dy: number }
  | { type: "resize-bed"; id: string; startX: number; startY: number };

function loadPlacements() {
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved) as Partial<Placement>[];

    return parsed
      .filter((placement): placement is Partial<Placement> & Pick<Placement, "id" | "cropId" | "bedId"> =>
        Boolean(placement.id && placement.cropId && placement.bedId),
      )
      .map((placement) => ({
        ...placement,
        plantCount: placement.plantCount ?? 1,
        columns: placement.columns ?? 1,
        rows: placement.rows ?? 1,
      })) as Placement[];
  } catch {
    return [];
  }
}

function loadGardenDefinition(): GardenDefinition {
  const fallback = createDefaultGardenDefinition();
  const saved = window.localStorage.getItem(gardenStorageKey);
  if (!saved) return fallback;

  try {
    const parsed = JSON.parse(saved) as Partial<GardenDefinition>;

    return {
      ...fallback,
      ...parsed,
      boundary: { ...fallback.boundary, ...parsed.boundary },
      beds: fallback.beds.map((bed) => ({
        ...bed,
        ...parsed.beds?.find((candidate) => candidate.id === bed.id),
      })),
      accessZones: fallback.accessZones.map((zone) => ({
        ...zone,
        ...parsed.accessZones?.find((candidate) => candidate.id === zone.id),
      })),
    };
  } catch {
    return fallback;
  }
}

function formatCoordinate(value: number) {
  return Number(value.toFixed(2)).toString();
}

export function App() {
  const [requests, setRequests] = React.useState<CropRequest>({
    tomato: 2,
    basil: 1,
    carrot: 1,
    lettuce: 1,
    bean: 0,
    cabbage: 0,
  });
  const [placements, setPlacements] = React.useState<Placement[]>(loadPlacements);
  const [garden, setGarden] = React.useState<GardenDefinition>(loadGardenDefinition);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedBedId, setSelectedBedId] = React.useState(garden.beds[0]?.id ?? "");
  const [selectedAccessZoneId, setSelectedAccessZoneId] = React.useState(garden.accessZones[0]?.id ?? "");
  const [viewBox, setViewBox] = React.useState(defaultGardenViewBox);
  const interactionRef = React.useRef<ActiveMapInteraction | null>(null);

  React.useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(placements));
  }, [placements]);

  React.useEffect(() => {
    window.localStorage.setItem(gardenStorageKey, JSON.stringify(garden));
  }, [garden]);

  const selectedPlacement = placements.find((placement) => placement.id === selectedId);
  const selectedBed = garden.beds.find((bed) => bed.id === selectedBedId);
  const selectedAccessZone = garden.accessZones.find((zone) => zone.id === selectedAccessZoneId);

  function updateRequest(cropId: CropId, delta: number) {
    setRequests((current) => ({
      ...current,
      [cropId]: Math.max(0, current[cropId] + delta),
    }));
  }

  function suggestPlan() {
    setPlacements(createSuggestions(requests, placements, Date.now(), garden.beds));
  }

  function resetPlan() {
    setPlacements([]);
    setSelectedId(null);
    window.localStorage.removeItem(storageKey);
  }

  function zoomIn() {
    setViewBox((current) => zoomViewBox(current, 0.82));
  }

  function zoomOut() {
    setViewBox((current) => zoomViewBox(current, 1.18));
  }

  function resetView() {
    setViewBox(defaultGardenViewBox);
  }

  function panMap(dx: number, dy: number) {
    setViewBox((current) => panViewBox(current, dx, dy));
  }

  function toggleLock(id: string) {
    setPlacements((current) =>
      current.map((placement) =>
        placement.id === id ? { ...placement, locked: !placement.locked } : placement,
      ),
    );
  }

  function updateGardenName(name: string) {
    setGarden((current) => ({ ...current, name }));
  }

  function replaceGarden(nextGarden: GardenDefinition) {
    setGarden(nextGarden);
    setPlacements([]);
    setSelectedId(null);
    setSelectedBedId(nextGarden.beds[0]?.id ?? "");
    setSelectedAccessZoneId(nextGarden.accessZones[0]?.id ?? "");
  }

  function resetGardenDefinition() {
    replaceGarden(createDefaultGardenDefinition());
  }

  function startBlankGarden() {
    replaceGarden(createBlankGardenDefinition());
  }

  async function importGardenFromSvg(file: File) {
    const text = await file.text();
    replaceGarden(parseGardenDefinitionFromSvg(text, file.name));
  }

  function addBed() {
    setGarden((current) => {
      const bed = createBed(current.beds.length + 1);
      setSelectedBedId(bed.id);
      return { ...current, beds: [...current.beds, bed] };
    });
  }

  function deleteSelectedBed() {
    if (!selectedBedId) return;
    setGarden((current) => ({
      ...current,
      beds: current.beds.filter((bed) => bed.id !== selectedBedId),
    }));
    setPlacements((current) => current.filter((placement) => placement.bedId !== selectedBedId));
    const nextBed = garden.beds.find((bed) => bed.id !== selectedBedId);
    setSelectedBedId(nextBed?.id ?? "");
  }

  function addAccessZone() {
    setGarden((current) => {
      const zone = createAccessZone(current.accessZones.length + 1);
      setSelectedAccessZoneId(zone.id);
      return { ...current, accessZones: [...current.accessZones, zone] };
    });
  }

  function deleteSelectedAccessZone() {
    if (!selectedAccessZoneId) return;
    setGarden((current) => ({
      ...current,
      accessZones: current.accessZones.filter((zone) => zone.id !== selectedAccessZoneId),
    }));
    const nextZone = garden.accessZones.find((zone) => zone.id !== selectedAccessZoneId);
    setSelectedAccessZoneId(nextZone?.id ?? "");
  }

  function updateSelectedBedName(name: string) {
    if (!selectedBedId) return;
    setGarden((current) => ({
      ...current,
      beds: current.beds.map((bed) => (bed.id === selectedBedId ? { ...bed, name } : bed)),
    }));
  }

  function updateSelectedBedSun(sun: SunExposure) {
    if (!selectedBedId) return;
    setGarden((current) => ({
      ...current,
      beds: current.beds.map((bed) => (bed.id === selectedBedId ? { ...bed, sun } : bed)),
    }));
  }

  function updateSelectedBedGeometry(key: keyof RectGeometry, value: number) {
    if (!selectedBedId || !Number.isFinite(value)) return;
    setGarden((current) => ({
      ...current,
      beds: current.beds.map((bed) =>
        bed.id === selectedBedId
          ? { ...bed, [key]: Math.max(key === "width" || key === "height" ? 1 : 0, value) }
          : bed,
      ),
    }));
  }

  function updateSelectedAccessZoneName(name: string) {
    if (!selectedAccessZoneId) return;
    setGarden((current) => ({
      ...current,
      accessZones: current.accessZones.map((zone) =>
        zone.id === selectedAccessZoneId ? { ...zone, name } : zone,
      ),
    }));
  }

  function updateSelectedAccessZoneKind(kind: "path" | "access") {
    if (!selectedAccessZoneId) return;
    setGarden((current) => ({
      ...current,
      accessZones: current.accessZones.map((zone) =>
        zone.id === selectedAccessZoneId ? { ...zone, kind } : zone,
      ),
    }));
  }

  function updateSelectedAccessZoneGeometry(key: keyof RectGeometry, value: number) {
    if (!selectedAccessZoneId || !Number.isFinite(value)) return;
    setGarden((current) => ({
      ...current,
      accessZones: current.accessZones.map((zone) =>
        zone.id === selectedAccessZoneId
          ? { ...zone, [key]: Math.max(key === "width" || key === "height" ? 1 : 0, value) }
          : zone,
      ),
    }));
  }

  function startDrag(event: React.PointerEvent<SVGRectElement>, placement: Placement) {
    if (placement.locked) return;
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const cursor = point.matrixTransform(svg.getScreenCTM()?.inverse());

    interactionRef.current = {
      type: "move-placement",
      id: placement.id,
      dx: cursor.x - placement.x,
      dy: cursor.y - placement.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(placement.id);
  }

  function moveDrag(event: React.PointerEvent<SVGSVGElement>) {
    const activeInteraction = interactionRef.current;
    if (!activeInteraction) return;
    const svg = event.currentTarget;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const cursor = point.matrixTransform(svg.getScreenCTM()?.inverse());

    if (activeInteraction.type === "move-bed") {
      const currentBed = garden.beds.find((bed) => bed.id === activeInteraction.id);
      if (!currentBed) return;

      const nextX = Math.max(
        garden.boundary.x,
        Math.min(
          garden.boundary.x + garden.boundary.width - currentBed.width,
          cursor.x - activeInteraction.dx,
        ),
      );
      const nextY = Math.max(
        garden.boundary.y,
        Math.min(
          garden.boundary.y + garden.boundary.height - currentBed.height,
          cursor.y - activeInteraction.dy,
        ),
      );
      const deltaX = nextX - currentBed.x;
      const deltaY = nextY - currentBed.y;

      setGarden((current) => ({
        ...current,
        beds: current.beds.map((bed) =>
          bed.id === activeInteraction.id ? { ...bed, x: nextX, y: nextY } : bed,
        ),
      }));
      setPlacements((current) =>
        current.map((placement) =>
          placement.bedId === activeInteraction.id
            ? { ...placement, x: placement.x + deltaX, y: placement.y + deltaY }
            : placement,
        ),
      );
      return;
    }

    if (activeInteraction.type === "resize-bed") {
      const currentBed = garden.beds.find((bed) => bed.id === activeInteraction.id);
      if (!currentBed) return;

      const nextBed = {
        ...currentBed,
        width: Math.max(
          24,
          Math.min(
            cursor.x - activeInteraction.startX,
            garden.boundary.x + garden.boundary.width - currentBed.x,
          ),
        ),
        height: Math.max(
          24,
          Math.min(
            cursor.y - activeInteraction.startY,
            garden.boundary.y + garden.boundary.height - currentBed.y,
          ),
        ),
      };

      setGarden((current) => ({
        ...current,
        beds: current.beds.map((bed) => (bed.id === activeInteraction.id ? nextBed : bed)),
      }));
      setPlacements((current) =>
        current.map((placement) =>
          placement.bedId === activeInteraction.id
            ? { ...placement, ...clampRectToBed(placement, nextBed) }
            : placement,
        ),
      );
      return;
    }

    setPlacements((current) =>
      current.map((placement) => {
        if (placement.id !== activeInteraction.id) return placement;

        if (activeInteraction.type === "move-placement") {
          const bed = garden.beds.find((candidate) => candidate.id === placement.bedId);
          if (!bed) return placement;
          const nextRect = clampRectToBed(
            {
              ...placement,
              x: cursor.x - activeInteraction.dx,
              y: cursor.y - activeInteraction.dy,
            },
            bed,
          );

          return {
            ...placement,
            x: nextRect.x,
            y: nextRect.y,
          };
        }

        const bed = garden.beds.find((candidate) => candidate.id === placement.bedId);
        if (!bed) return placement;

        const clampedSize = clampRectSizeToBed(
          {
            ...placement,
            width: Math.max(1, cursor.x - activeInteraction.startX),
            height: Math.max(1, cursor.y - activeInteraction.startY),
          },
          bed,
        );
        const layout = getBlockLayoutFromSize(
          cropById[placement.cropId],
          bed,
          clampedSize.width,
          clampedSize.height,
        );

        return {
          ...placement,
          plantCount: layout.plantCount,
          columns: layout.columns,
          rows: layout.rows,
          width: layout.width,
          height: layout.height,
        };
      }),
    );
  }

  function endDrag() {
    interactionRef.current = null;
  }

  function startResize(event: React.PointerEvent<SVGRectElement>, placement: Placement) {
    if (placement.locked) return;
    event.stopPropagation();
    interactionRef.current = {
      type: "resize-placement",
      id: placement.id,
      startX: placement.x,
      startY: placement.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(placement.id);
  }

  function startBedDrag(event: React.PointerEvent<SVGRectElement>, bedId: string) {
    const svg = event.currentTarget.ownerSVGElement;
    const bed = garden.beds.find((candidate) => candidate.id === bedId);
    if (!svg || !bed) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const cursor = point.matrixTransform(svg.getScreenCTM()?.inverse());

    interactionRef.current = {
      type: "move-bed",
      id: bed.id,
      dx: cursor.x - bed.x,
      dy: cursor.y - bed.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedBedId(bed.id);
  }

  function startBedResize(event: React.PointerEvent<SVGRectElement>, bedId: string) {
    const bed = garden.beds.find((candidate) => candidate.id === bedId);
    if (!bed) return;
    event.stopPropagation();
    interactionRef.current = {
      type: "resize-bed",
      id: bed.id,
      startX: bed.x,
      startY: bed.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedBedId(bed.id);
  }

  return (
    <main className="app-shell">
      <section className="garden-stage" aria-label="Garden map">
        <header className="topbar">
          <div>
            <p>Favarge Gardening</p>
            <h1>Garden plan</h1>
          </div>
          <div className="weather-pill">
            <Droplets size={18} />
            MeteoSwiss adapter planned
          </div>
        </header>

        <div className="map-toolbar" aria-label="Map controls">
          <button type="button" onClick={zoomIn} aria-label="Zoom in" title="Zoom in">
            <ZoomIn size={18} />
          </button>
          <button type="button" onClick={zoomOut} aria-label="Zoom out" title="Zoom out">
            <ZoomOut size={18} />
          </button>
          <button type="button" onClick={resetView} aria-label="Reset map view" title="Reset map view">
            <Home size={18} />
          </button>
          <button type="button" onClick={() => panMap(0, -36)} aria-label="Pan up" title="Pan up">
            <ArrowUp size={18} />
          </button>
          <button type="button" onClick={() => panMap(-36, 0)} aria-label="Pan left" title="Pan left">
            <ArrowLeft size={18} />
          </button>
          <button type="button" onClick={() => panMap(36, 0)} aria-label="Pan right" title="Pan right">
            <ArrowRight size={18} />
          </button>
          <button type="button" onClick={() => panMap(0, 36)} aria-label="Pan down" title="Pan down">
            <ArrowDown size={18} />
          </button>
        </div>

        <svg
          className="garden-map"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          role="img"
          aria-label="Measured Favarge garden map"
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          <rect
            x={garden.boundary.x}
            y={garden.boundary.y}
            width={garden.boundary.width}
            height={garden.boundary.height}
            rx="6"
            className="garden-boundary"
          />
          {garden.accessZones.map((zone) => (
            <g key={zone.id} onClick={() => setSelectedAccessZoneId(zone.id)}>
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.width}
                height={zone.height}
                className={
                  selectedAccessZoneId === zone.id ? "access-zone selected-access-zone" : "access-zone"
                }
              />
              <text x={zone.x + 12} y={zone.y + 24} className="access-label">
                {zone.name}
              </text>
            </g>
          ))}

          {garden.beds.map((bed) => (
            <g key={bed.id} onClick={() => setSelectedBedId(bed.id)}>
              <rect
                x={bed.x}
                y={bed.y}
                width={bed.width}
                height={bed.height}
                rx="5"
                className={selectedBedId === bed.id ? "bed selected-bed" : "bed"}
                onPointerDown={(event) => startBedDrag(event, bed.id)}
              />
              <text x={bed.x + 12} y={bed.y + 24} className="bed-label">
                {bed.name}
              </text>
              <text x={bed.x + 12} y={bed.y + bed.height - 14} className="bed-meta">
                {getBedLabel(bed)}
              </text>
              {selectedBedId === bed.id ? (
                <rect
                  x={bed.x + bed.width - 10}
                  y={bed.y + bed.height - 10}
                  width="10"
                  height="10"
                  rx="2"
                  className="bed-resize-handle"
                  onPointerDown={(event) => startBedResize(event, bed.id)}
                />
              ) : null}
            </g>
          ))}

          <path d="M449.67 723.87 L522.18 724.22" className="hidden-reference-line" />

          {placements.map((placement) => {
            const crop = cropById[placement.cropId];
            const selected = placement.id === selectedId;
            const bed = garden.beds.find((candidate) => candidate.id === placement.bedId);
            const footprint = bed ? getCropFootprint(crop, bed) : undefined;
            const markerRadius = footprint
              ? Math.max(2.8, Math.min(6, Math.min(footprint.width, footprint.height) * 0.18))
              : 4;
            return (
              <g
                key={placement.id}
                className={selected ? "placement selected" : "placement"}
                onClick={() => setSelectedId(placement.id)}
              >
                <rect
                  x={placement.x}
                  y={placement.y}
                  width={placement.width}
                  height={placement.height}
                  rx="5"
                  fill={crop.color}
                  onPointerDown={(event) => startDrag(event, placement)}
                />
                {Array.from({ length: placement.plantCount }, (_, markerIndex) => {
                  const markerColumn = markerIndex % placement.columns;
                  const markerRow = Math.floor(markerIndex / placement.columns);
                  const markerX = footprint
                    ? placement.x + footprint.width * markerColumn + footprint.width / 2
                    : placement.x + placement.width / 2;
                  const markerY = footprint
                    ? placement.y + footprint.height * markerRow + footprint.height / 2
                    : placement.y + placement.height / 2;

                  return (
                    <circle
                      key={`${placement.id}-marker-${markerIndex}`}
                      cx={markerX}
                      cy={markerY}
                      r={markerRadius}
                      className="plant-marker"
                    />
                  );
                })}
                <text
                  x={placement.x + placement.width / 2}
                  y={placement.y + placement.height / 2 + 4}
                  className="placement-icon"
                >
                  {crop.name.slice(0, 1)}
                </text>
                {!placement.locked ? (
                  <rect
                    x={placement.x + placement.width - 8}
                    y={placement.y + placement.height - 8}
                    width="8"
                    height="8"
                    rx="2"
                    className="resize-handle"
                    onPointerDown={(event) => startResize(event, placement)}
                  />
                ) : null}
              </g>
            );
          })}
        </svg>
      </section>

      <aside className="planner-panel">
        <section className="panel-section">
          <h2>Garden definition</h2>
          <label className="field-label">
            Garden name
            <input value={garden.name} onChange={(event) => updateGardenName(event.target.value)} />
          </label>
          <div className="definition-grid">
            <span>Source</span>
            <strong>{garden.sourceDrawing}</strong>
            <span>Scale</span>
            <strong>{garden.scaleDescription}</strong>
            <span>Beds</span>
            <strong>{garden.beds.length}</strong>
            <span>Paths</span>
            <strong>{garden.accessZones.length}</strong>
          </div>
          <div className="button-row">
            <button className="secondary-action" type="button" onClick={startBlankGarden}>
              Blank
            </button>
            <button className="secondary-action" type="button" onClick={resetGardenDefinition}>
              Reset
            </button>
          </div>
          <label className="file-button">
            Import SVG
            <input
              type="file"
              accept=".svg,image/svg+xml"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importGardenFromSvg(file);
                event.target.value = "";
              }}
            />
          </label>
          <div className="button-row">
            <button className="secondary-action" type="button" onClick={addBed}>
              Add bed
            </button>
            <button className="secondary-action" type="button" onClick={addAccessZone}>
              Add path
            </button>
          </div>
          {selectedBed ? (
            <div className="selection-card">
              <label className="field-label">
                Selected bed
                <input
                  value={selectedBed.name}
                  onChange={(event) => updateSelectedBedName(event.target.value)}
                />
              </label>
              <div className="definition-grid">
                <span>Size</span>
                <strong>{getBedLabel(selectedBed)}</strong>
              </div>
              <div className="geometry-grid">
                {(["x", "y", "width", "height"] as const).map((key) => (
                  <label className="field-label" key={key}>
                    {key}
                    <input
                      type="number"
                      step="0.1"
                      value={formatCoordinate(selectedBed[key])}
                      onChange={(event) => updateSelectedBedGeometry(key, event.currentTarget.valueAsNumber)}
                    />
                  </label>
                ))}
              </div>
              <div className="segmented-control" aria-label="Bed sun exposure">
                <button
                  type="button"
                  className={selectedBed.sun === "full" ? "active" : ""}
                  onClick={() => updateSelectedBedSun("full")}
                >
                  Full sun
                </button>
                <button
                  type="button"
                  className={selectedBed.sun === "partial" ? "active" : ""}
                  onClick={() => updateSelectedBedSun("partial")}
                >
                  Partial
                </button>
              </div>
              <button className="secondary-action" type="button" onClick={deleteSelectedBed}>
                Delete bed
              </button>
            </div>
          ) : null}
          {selectedAccessZone ? (
            <div className="selection-card">
              <label className="field-label">
                Selected path/access
                <input
                  value={selectedAccessZone.name}
                  onChange={(event) => updateSelectedAccessZoneName(event.target.value)}
                />
              </label>
              <div className="segmented-control" aria-label="Access zone type">
                <button
                  type="button"
                  className={selectedAccessZone.kind === "path" ? "active" : ""}
                  onClick={() => updateSelectedAccessZoneKind("path")}
                >
                  Path
                </button>
                <button
                  type="button"
                  className={selectedAccessZone.kind === "access" ? "active" : ""}
                  onClick={() => updateSelectedAccessZoneKind("access")}
                >
                  Access
                </button>
              </div>
              <div className="geometry-grid">
                {(["x", "y", "width", "height"] as const).map((key) => (
                  <label className="field-label" key={key}>
                    {key}
                    <input
                      type="number"
                      step="0.1"
                      value={formatCoordinate(selectedAccessZone[key])}
                      onChange={(event) =>
                        updateSelectedAccessZoneGeometry(key, event.currentTarget.valueAsNumber)
                      }
                    />
                  </label>
                ))}
              </div>
              <button className="secondary-action" type="button" onClick={deleteSelectedAccessZone}>
                Delete path
              </button>
            </div>
          ) : null}
        </section>

        <section className="panel-section">
          <div className="section-title">
            <Sprout size={18} />
            <h2>Required vegetables</h2>
          </div>
          <div className="crop-list">
            {crops.map((crop) => (
              <div className="crop-row" key={crop.id}>
                <span className="crop-swatch" style={{ background: crop.color }} />
                <div>
                  <strong>{crop.name}</strong>
                  <span>
                    {crop.family} - {describeWater(crop.water)}
                  </span>
                  <span>
                    {crop.spacingCm.inRow} x {crop.spacingCm.betweenRows} cm
                  </span>
                </div>
                <div className="stepper" aria-label={`${crop.name} quantity`}>
                  <button
                    type="button"
                    onClick={() => updateRequest(crop.id, -1)}
                    aria-label={`Decrease ${crop.name}`}
                  >
                    -
                  </button>
                  <output>{requests[crop.id]}</output>
                  <button
                    type="button"
                    onClick={() => updateRequest(crop.id, 1)}
                    aria-label={`Increase ${crop.name}`}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="primary-action" type="button" onClick={suggestPlan}>
            <Sparkles size={18} />
            Suggest layout
          </button>
        </section>

        <section className="panel-section details-section">
          <h2>Selection</h2>
          {selectedPlacement ? (
            <div className="selection-card">
              <div>
                <strong>{cropById[selectedPlacement.cropId].name}</strong>
                <span>{getCompanionSummary(selectedPlacement, placements)}</span>
              </div>
              <p>
                Plants in block: {selectedPlacement.plantCount} ({selectedPlacement.columns} x{" "}
                {selectedPlacement.rows}).
              </p>
              <p>
                Spacing footprint: {cropById[selectedPlacement.cropId].spacingCm.inRow} x{" "}
                {cropById[selectedPlacement.cropId].spacingCm.betweenRows} cm.
              </p>
              <p>{selectedPlacement.reason}</p>
              <button
                className="secondary-action"
                type="button"
                onClick={() => toggleLock(selectedPlacement.id)}
              >
                {selectedPlacement.locked ? <LockOpen size={17} /> : <Lock size={17} />}
                {selectedPlacement.locked ? "Unlock placement" : "Lock placement"}
              </button>
            </div>
          ) : (
            <p className="muted">Select a crop block on the map to review companions and lock it in place.</p>
          )}
        </section>

        <section className="panel-section">
          <h2>Plan controls</h2>
          <button className="secondary-action" type="button" onClick={resetPlan}>
            <RotateCcw size={17} />
            Reset draft
          </button>
        </section>
      </aside>
    </main>
  );
}
