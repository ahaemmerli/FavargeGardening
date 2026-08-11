import React from "react";
import ReactDOM from "react-dom/client";
import { Droplets, Lock, LockOpen, RotateCcw, Sparkles, Sprout } from "lucide-react";
import "./styles.css";

type CropId = "tomato" | "basil" | "carrot" | "lettuce" | "bean" | "cabbage";

type Crop = {
  id: CropId;
  name: string;
  family: string;
  water: "low" | "medium" | "high";
  sun: "partial" | "full";
  color: string;
  companions: CropId[];
  avoid: CropId[];
};

type Bed = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sun: "partial" | "full";
};

type AccessZone = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type CropRequest = Record<CropId, number>;

type Placement = {
  id: string;
  cropId: CropId;
  bedId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  locked: boolean;
  reason: string;
};

const storageKey = "favarge-gardening-plan-v1";

const crops: Crop[] = [
  {
    id: "tomato",
    name: "Tomato",
    family: "Nightshade",
    water: "high",
    sun: "full",
    color: "#d94f38",
    companions: ["basil", "carrot", "lettuce"],
    avoid: ["cabbage"],
  },
  {
    id: "basil",
    name: "Basil",
    family: "Mint",
    water: "medium",
    sun: "full",
    color: "#3f9b58",
    companions: ["tomato"],
    avoid: [],
  },
  {
    id: "carrot",
    name: "Carrot",
    family: "Umbellifer",
    water: "medium",
    sun: "full",
    color: "#e58935",
    companions: ["tomato", "lettuce", "bean"],
    avoid: [],
  },
  {
    id: "lettuce",
    name: "Lettuce",
    family: "Aster",
    water: "high",
    sun: "partial",
    color: "#78b74a",
    companions: ["carrot", "tomato"],
    avoid: [],
  },
  {
    id: "bean",
    name: "Bean",
    family: "Legume",
    water: "medium",
    sun: "full",
    color: "#2f8f7c",
    companions: ["carrot", "cabbage"],
    avoid: [],
  },
  {
    id: "cabbage",
    name: "Cabbage",
    family: "Brassica",
    water: "high",
    sun: "full",
    color: "#6b8f42",
    companions: ["bean"],
    avoid: ["tomato"],
  },
];

const beds: Bed[] = [
  { id: "left-lower", name: "Left lower bed", x: 75.76, y: 341.18, width: 243.86, height: 69.14, sun: "full" },
  { id: "right-upper", name: "Right upper bed", x: 378.1, y: 125.33, width: 377.95, height: 94.49, sun: "full" },
  { id: "right-middle", name: "Right middle bed", x: 378.1, y: 219.82, width: 377.95, height: 94.49, sun: "full" },
  { id: "right-lower", name: "Right lower bed", x: 378.1, y: 314.31, width: 377.95, height: 94.49, sun: "full" },
];

const cropById = Object.fromEntries(crops.map((crop) => [crop.id, crop])) as Record<CropId, Crop>;

const accessZones: AccessZone[] = [
  { id: "left-main-access", name: "Access", x: 74.68, y: 56.1, width: 243.62, height: 284 },
  { id: "central-access", name: "Access", x: 319.43, y: 56.05, width: 60.31, height: 403.56 },
  { id: "top-access", name: "Access", x: 379.71, y: 56.05, width: 376.35, height: 69.29 },
  { id: "right-bottom-access", name: "Access", x: 379.55, y: 408.63, width: 376.67, height: 51.1 },
  { id: "left-bottom-access", name: "Access", x: 75.69, y: 410.29, width: 244, height: 49.61 },
];

function loadPlacements() {
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return [];

  try {
    return JSON.parse(saved) as Placement[];
  } catch {
    return [];
  }
}

function describeWater(water: Crop["water"]) {
  return water === "high" ? "High water" : water === "medium" ? "Moderate water" : "Low water";
}

function getCompanionSummary(placement: Placement, placements: Placement[]) {
  const crop = cropById[placement.cropId];
  const neighbors = placements.filter((other) => other.id !== placement.id && other.bedId === placement.bedId);
  const good = neighbors.filter((other) => crop.companions.includes(other.cropId)).map((other) => cropById[other.cropId].name);
  const bad = neighbors.filter((other) => crop.avoid.includes(other.cropId)).map((other) => cropById[other.cropId].name);

  if (bad.length > 0) return `Avoid near ${bad.join(", ")}`;
  if (good.length > 0) return `Good companion: ${good.join(", ")}`;
  return "No companion conflict";
}

function createSuggestions(requests: CropRequest, existing: Placement[]) {
  const locked = existing.filter((placement) => placement.locked);
  const suggestions: Placement[] = [...locked];
  const bedOffsets = new Map<string, number>();

  for (const placement of locked) {
    const count = bedOffsets.get(placement.bedId) ?? 0;
    bedOffsets.set(placement.bedId, count + 1);
  }

  for (const [cropId, count] of Object.entries(requests) as [CropId, number][]) {
    if (count <= 0) continue;

    const crop = cropById[cropId];
    const alreadyLocked = locked.filter((placement) => placement.cropId === cropId).length;
    const missing = Math.max(0, count - alreadyLocked);

    for (let index = 0; index < missing; index += 1) {
      const preferredBed =
        beds.find((bed) => bed.sun === crop.sun && !suggestions.some((placement) => crop.avoid.includes(placement.cropId) && placement.bedId === bed.id)) ??
        beds.find((bed) => !suggestions.some((placement) => crop.avoid.includes(placement.cropId) && placement.bedId === bed.id)) ??
        beds[0];

      const offset = bedOffsets.get(preferredBed.id) ?? 0;
      const width = crop.id === "basil" || crop.id === "lettuce" ? 70 : 90;
      const height = crop.id === "bean" || crop.id === "tomato" ? 62 : 52;
      const columns = Math.max(1, Math.floor((preferredBed.width - 28) / 98));
      const column = offset % columns;
      const row = Math.floor(offset / columns);

      bedOffsets.set(preferredBed.id, offset + 1);
      suggestions.push({
        id: `${cropId}-${Date.now()}-${index}`,
        cropId,
        bedId: preferredBed.id,
        x: preferredBed.x + 18 + column * 104,
        y: preferredBed.y + 18 + row * 78,
        width,
        height,
        locked: false,
        reason: `${preferredBed.name} matches ${crop.sun} sun and avoids known conflicts.`,
      });
    }
  }

  return suggestions;
}

function App() {
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

  function toggleLock(id: string) {
    setPlacements((current) =>
      current.map((placement) => (placement.id === id ? { ...placement, locked: !placement.locked } : placement)),
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
          ? { ...placement, x: Math.max(60, Math.min(770 - placement.width, cursor.x - dragRef.current.dx)), y: Math.max(48, Math.min(470 - placement.height, cursor.y - dragRef.current.dy)) }
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

        <svg className="garden-map" viewBox="50 38 730 442" role="img" aria-label="Measured Favarge garden map" onPointerMove={moveDrag} onPointerUp={endDrag} onPointerLeave={endDrag}>
          <rect x="64" y="48" width="704" height="422" rx="6" className="garden-boundary" />
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
                {bed.id === "left-lower" ? "3 m x 1 m" : "5 m x 1.25 m"}
              </text>
            </g>
          ))}

          <path d="M449.67 723.87 L522.18 724.22" className="hidden-reference-line" />

          {placements.map((placement) => {
            const crop = cropById[placement.cropId];
            const selected = placement.id === selectedId;
            return (
              <g key={placement.id} className={selected ? "placement selected" : "placement"} onClick={() => setSelectedId(placement.id)}>
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
                  <span>{crop.family} - {describeWater(crop.water)}</span>
                </div>
                <div className="stepper" aria-label={`${crop.name} quantity`}>
                  <button type="button" onClick={() => updateRequest(crop.id, -1)} aria-label={`Decrease ${crop.name}`}>-</button>
                  <output>{requests[crop.id]}</output>
                  <button type="button" onClick={() => updateRequest(crop.id, 1)} aria-label={`Increase ${crop.name}`}>+</button>
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
              <button className="secondary-action" type="button" onClick={() => toggleLock(selectedPlacement.id)}>
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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
