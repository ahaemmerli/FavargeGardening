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
  accessZones,
  beds,
  defaultGardenViewBox,
  gardenBoundary,
  getBedLabel,
  panViewBox,
  zoomViewBox,
} from "./garden";
import {
  createSuggestions,
  cropById,
  crops,
  describeWater,
  getCompanionSummary,
  type CropId,
  type CropRequest,
  type Placement,
} from "./planner";

const storageKey = "favarge-gardening-plan-v1";

function loadPlacements() {
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return [];

  try {
    return JSON.parse(saved) as Placement[];
  } catch {
    return [];
  }
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
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [viewBox, setViewBox] = React.useState(defaultGardenViewBox);
  const dragRef = React.useRef<{ id: string; dx: number; dy: number } | null>(null);

  React.useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(placements));
  }, [placements]);

  const selectedPlacement = placements.find((placement) => placement.id === selectedId);

  function updateRequest(cropId: CropId, delta: number) {
    setRequests((current) => ({
      ...current,
      [cropId]: Math.max(0, current[cropId] + delta),
    }));
  }

  function suggestPlan() {
    setPlacements(createSuggestions(requests, placements));
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

  function startDrag(event: React.PointerEvent<SVGRectElement>, placement: Placement) {
    if (placement.locked) return;
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const cursor = point.matrixTransform(svg.getScreenCTM()?.inverse());

    dragRef.current = {
      id: placement.id,
      dx: cursor.x - placement.x,
      dy: cursor.y - placement.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(placement.id);
  }

  function moveDrag(event: React.PointerEvent<SVGSVGElement>) {
    if (!dragRef.current) return;
    const svg = event.currentTarget;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const cursor = point.matrixTransform(svg.getScreenCTM()?.inverse());

    setPlacements((current) =>
      current.map((placement) =>
        placement.id === dragRef.current?.id
          ? {
              ...placement,
              x: Math.max(60, Math.min(770 - placement.width, cursor.x - dragRef.current.dx)),
              y: Math.max(48, Math.min(470 - placement.height, cursor.y - dragRef.current.dy)),
            }
          : placement,
      ),
    );
  }

  function endDrag() {
    dragRef.current = null;
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
            x={gardenBoundary.x}
            y={gardenBoundary.y}
            width={gardenBoundary.width}
            height={gardenBoundary.height}
            rx="6"
            className="garden-boundary"
          />
          {accessZones.map((zone) => (
            <g key={zone.id}>
              <rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} className="access-zone" />
              <text x={zone.x + 12} y={zone.y + 24} className="access-label">
                {zone.name}
              </text>
            </g>
          ))}

          {beds.map((bed) => (
            <g key={bed.id}>
              <rect x={bed.x} y={bed.y} width={bed.width} height={bed.height} rx="5" className="bed" />
              <text x={bed.x + 12} y={bed.y + 24} className="bed-label">
                {bed.name}
              </text>
              <text x={bed.x + 12} y={bed.y + bed.height - 14} className="bed-meta">
                {getBedLabel(bed)}
              </text>
            </g>
          ))}

          <path d="M449.67 723.87 L522.18 724.22" className="hidden-reference-line" />

          {placements.map((placement) => {
            const crop = cropById[placement.cropId];
            const selected = placement.id === selectedId;
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
                <text x={placement.x + 10} y={placement.y + 24} className="placement-name">
                  {crop.name}
                </text>
                <text x={placement.x + 10} y={placement.y + 45} className="placement-meta">
                  {placement.locked ? "locked" : describeWater(crop.water)}
                </text>
              </g>
            );
          })}
        </svg>
      </section>

      <aside className="planner-panel">
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
