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
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Sprout,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  clampRectToBoundary,
  clampRectSizeToBed,
  clampRectToBed,
  chooseScaleBarMeters,
  createAccessZone,
  createBed,
  createBlankGardenDefinition,
  createDefaultGardenDefinition,
  defaultGardenViewBox,
  findBedAtPoint,
  formatScaleBarLabel,
  getBedLabel,
  getBedGridSize,
  metersToSvgFromScale,
  normalizeGardenDefinition,
  parseGardenDefinitionFromSvg,
  panViewBox,
  snapPointToBedGrid,
  snapRectSizeToBedGrid,
  svgUnitsToRealMeters,
  type GardenDefinition,
  type RectGeometry,
  type SavedGardenDefinition,
  type SunExposure,
  zoomViewBox,
} from "./garden";
import {
  calculateGardenValueScore,
  cropById,
  crops,
  describeCropIntent,
  describeGardenValue,
  describeWater,
  describeYieldEstimate,
  filterCrops,
  getCropCategories,
  suggestAdditionalCrops,
  type CropId,
  type CropRequest,
  type CropSeasonFilter,
} from "./cropCatalog";
import {
  analyzePlacements,
  canInterplant,
  createAdditionalPlacement,
  getBlockLayoutFromSize,
  getCropFootprint,
  getCompanionSummary,
  getStarterPlantsForIntent,
  normalizePeopleCount,
  optimizePlacementsForRequests,
  type Placement,
} from "./planner";

const storageKey = "favarge-gardening-plan-v1";
const gardenStorageKey = "favarge-gardening-definition-v1";

type ActiveMapInteraction =
  | { type: "move-placement"; id: string; dx: number; dy: number }
  | { type: "resize-placement"; id: string; startX: number; startY: number }
  | { type: "move-boundary"; dx: number; dy: number }
  | { type: "resize-boundary"; startX: number; startY: number }
  | { type: "move-bed"; id: string; dx: number; dy: number }
  | { type: "resize-bed"; id: string; startX: number; startY: number }
  | { type: "move-access-zone"; id: string; dx: number; dy: number }
  | { type: "resize-access-zone"; id: string; startX: number; startY: number };

type SidebarTab = "garden" | "crops" | "analysis";

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
        mode: placement.mode === "interplant" || placement.mode === "border" ? placement.mode : "standalone",
        hostPlacementId:
          typeof placement.hostPlacementId === "string" ? placement.hostPlacementId : undefined,
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
    const parsed = JSON.parse(saved) as SavedGardenDefinition;

    return normalizeGardenDefinition(parsed, fallback);
  } catch {
    return fallback;
  }
}

function formatCoordinate(value: number) {
  return Number(value.toFixed(2)).toString();
}

function formatMeterCoordinate(svgUnits: number) {
  return formatCoordinate(svgUnitsToRealMeters(svgUnits));
}

function formatGeometryLabel(key: keyof RectGeometry) {
  return `${key} (m)`;
}

function metersInputToSvgUnits(value: number) {
  return metersToSvgFromScale(Math.max(0, value));
}

function formatYieldAmount(value: number) {
  return Number(value.toFixed(1)).toString();
}

function calculatePlacementAreaSquareMeters(placement: Placement) {
  return svgUnitsToRealMeters(placement.width) * svgUnitsToRealMeters(placement.height);
}

function describePlacementYield(placement: Placement) {
  const crop = cropById[placement.cropId];
  const estimate = crop.yieldEstimate;
  const multiplier =
    estimate.basis === "perPlant" ? placement.plantCount : calculatePlacementAreaSquareMeters(placement);
  const amount = estimate.range
    ? `${formatYieldAmount(estimate.range.low * multiplier)}-${formatYieldAmount(estimate.range.high * multiplier)}`
    : formatYieldAmount(estimate.amount * multiplier);

  return `${amount} ${estimate.unit}`;
}

function createGardenDefinitionFilename(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "garden"}-definition.json`;
}

function moveGardenDefinition(garden: GardenDefinition, deltaX: number, deltaY: number): GardenDefinition {
  return {
    ...garden,
    boundary: {
      ...garden.boundary,
      x: garden.boundary.x + deltaX,
      y: garden.boundary.y + deltaY,
    },
    beds: garden.beds.map((bed) => ({ ...bed, x: bed.x + deltaX, y: bed.y + deltaY })),
    accessZones: garden.accessZones.map((zone) => ({
      ...zone,
      x: zone.x + deltaX,
      y: zone.y + deltaY,
    })),
  };
}

export function App() {
  const [requests, setRequests] = React.useState<CropRequest[]>([
    { cropId: "tomato", priority: "must", intent: "normal", placementMode: "auto" },
    { cropId: "basil", priority: "nice", intent: "normal", placementMode: "auto" },
    { cropId: "carrot", priority: "nice", intent: "some", placementMode: "auto" },
    { cropId: "lettuce", priority: "nice", intent: "some", placementMode: "auto" },
  ]);
  const [cropPickerOpen, setCropPickerOpen] = React.useState(false);
  const [cropSearch, setCropSearch] = React.useState("");
  const [peopleToFeed, setPeopleToFeed] = React.useState(1);
  const [cropCategoryFilter, setCropCategoryFilter] = React.useState("all");
  const [cropSeasonFilter, setCropSeasonFilter] = React.useState<CropSeasonFilter>("all");
  const [cropSunFilter, setCropSunFilter] = React.useState<"all" | "partial" | "full">("all");
  const [cropWaterFilter, setCropWaterFilter] = React.useState<"all" | "low" | "medium" | "high">("all");
  const [cropSuitabilityFilter, setCropSuitabilityFilter] = React.useState<
    "all" | "excellent" | "good" | "poor"
  >("all");
  const [highValueOnly, setHighValueOnly] = React.useState(false);
  const [placements, setPlacements] = React.useState<Placement[]>(loadPlacements);
  const [garden, setGarden] = React.useState<GardenDefinition>(loadGardenDefinition);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedBedId, setSelectedBedId] = React.useState(garden.beds[0]?.id ?? "");
  const [selectedAccessZoneId, setSelectedAccessZoneId] = React.useState(garden.accessZones[0]?.id ?? "");
  const [viewBox, setViewBox] = React.useState(defaultGardenViewBox);
  const [gardenSaveStatus, setGardenSaveStatus] = React.useState("Saved locally");
  const [activeSidebarTab, setActiveSidebarTab] = React.useState<SidebarTab>("crops");
  const interactionRef = React.useRef<ActiveMapInteraction | null>(null);

  React.useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(placements));
  }, [placements]);

  React.useEffect(() => {
    window.localStorage.setItem(gardenStorageKey, JSON.stringify(garden));
    setGardenSaveStatus("Saved locally");
  }, [garden]);

  const selectedPlacement = placements.find((placement) => placement.id === selectedId);
  const selectedBed = garden.beds.find((bed) => bed.id === selectedBedId);
  const selectedAccessZone = garden.accessZones.find((zone) => zone.id === selectedAccessZoneId);
  const gardenDefinitionLocked = garden.locked;
  const selectedInterplantHosts = selectedPlacement
    ? placements.filter(
        (placement) =>
          placement.id !== selectedPlacement.id &&
          placement.bedId === selectedPlacement.bedId &&
          canInterplant(selectedPlacement.cropId, placement.cropId),
      )
    : [];

  function addCropRequest(cropId: CropId) {
    setRequests((current) =>
      current.some((request) => request.cropId === cropId)
        ? current
        : [...current, { cropId, priority: "nice", intent: "normal", placementMode: "auto" }],
    );
    setCropSearch("");
    setCropPickerOpen(false);
  }

  function removeCropRequest(cropId: CropId) {
    setRequests((current) => current.filter((request) => request.cropId !== cropId));
  }

  function updateRequestPriority(cropId: CropId, priority: CropRequest["priority"]) {
    setRequests((current) =>
      current.map((request) => (request.cropId === cropId ? { ...request, priority } : request)),
    );
  }

  function updateRequestIntent(cropId: CropId, intent: CropRequest["intent"]) {
    setRequests((current) =>
      current.map((request) => (request.cropId === cropId ? { ...request, intent } : request)),
    );
  }

  function updateRequestPlacementMode(cropId: CropId, placementMode: CropRequest["placementMode"]) {
    setRequests((current) =>
      current.map((request) => (request.cropId === cropId ? { ...request, placementMode } : request)),
    );
    setPlacements((current) =>
      current.map((placement) =>
        placement.cropId === cropId && !placement.locked
          ? {
              ...placement,
              mode: placementMode === "auto" || !placementMode ? "standalone" : placementMode,
              hostPlacementId: placementMode === "interplant" ? placement.hostPlacementId : undefined,
            }
          : placement,
      ),
    );
  }

  function updatePeopleToFeed(value: number) {
    setPeopleToFeed(normalizePeopleCount(value));
  }

  function suggestPlan() {
    setPlacements(
      optimizePlacementsForRequests(
        requests,
        placements,
        Date.now(),
        garden.beds,
        garden.accessZones,
        peopleToFeed,
      ),
    );
  }

  function addCropPlacementBlock(cropId: CropId) {
    const request = requests.find((candidate) => candidate.cropId === cropId);
    if (!request) return;

    const placement = createAdditionalPlacement(
      request,
      placements,
      Date.now(),
      garden.beds,
      undefined,
      garden.accessZones,
      peopleToFeed,
    );
    if (!placement) return;

    setPlacements((current) => [...current, placement]);
    setSelectedId(placement.id);
    setSelectedBedId("");
    setSelectedAccessZoneId("");
    setActiveSidebarTab("analysis");
  }

  function deleteLatestCropPlacementBlock(cropId: CropId) {
    const removable = [...placements]
      .reverse()
      .find((placement) => placement.cropId === cropId && !placement.locked);
    if (!removable) return;

    setPlacements((current) => current.filter((placement) => placement.id !== removable.id));
    if (selectedId === removable.id) setSelectedId(null);
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

  function updatePlacementHost(id: string, hostPlacementId: string) {
    setPlacements((current) =>
      current.map((placement) =>
        placement.id === id
          ? {
              ...placement,
              mode: "interplant",
              hostPlacementId: hostPlacementId || undefined,
            }
          : placement,
      ),
    );
  }

  function updateGardenName(name: string) {
    if (gardenDefinitionLocked) return;
    setGarden((current) => ({ ...current, name }));
  }

  function updateGardenBoundaryGeometry(key: keyof RectGeometry, value: number) {
    if (gardenDefinitionLocked) return;
    if (!Number.isFinite(value)) return;
    const svgValue = metersInputToSvgUnits(value);

    if (key === "x" || key === "y") {
      const deltaX = key === "x" ? svgValue - garden.boundary.x : 0;
      const deltaY = key === "y" ? svgValue - garden.boundary.y : 0;

      setGarden((current) => moveGardenDefinition(current, deltaX, deltaY));
      setPlacements((current) =>
        current.map((placement) => ({
          ...placement,
          x: placement.x + deltaX,
          y: placement.y + deltaY,
        })),
      );
      return;
    }

    setGarden((current) => ({
      ...current,
      boundary: {
        ...current.boundary,
        [key]: Math.max(48, svgValue),
      },
    }));
  }

  function replaceGarden(nextGarden: GardenDefinition) {
    setGarden(nextGarden);
    setPlacements([]);
    setSelectedId(null);
    setSelectedBedId(nextGarden.beds[0]?.id ?? "");
    setSelectedAccessZoneId(nextGarden.accessZones[0]?.id ?? "");
  }

  function resetGardenDefinition() {
    if (gardenDefinitionLocked) return;
    replaceGarden(createDefaultGardenDefinition());
  }

  function startBlankGarden() {
    if (gardenDefinitionLocked) return;
    replaceGarden(createBlankGardenDefinition());
  }

  async function importGardenFromSvg(file: File) {
    if (gardenDefinitionLocked) return;
    const text = await file.text();
    replaceGarden(parseGardenDefinitionFromSvg(text, file.name));
  }

  async function importGardenDefinitionFromJson(file: File) {
    if (gardenDefinitionLocked) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as SavedGardenDefinition;
      replaceGarden(normalizeGardenDefinition(parsed));
      setGardenSaveStatus(`Imported ${file.name}`);
    } catch {
      setGardenSaveStatus("Import failed");
    }
  }

  function saveGardenDefinition() {
    window.localStorage.setItem(gardenStorageKey, JSON.stringify(garden));

    const blob = new Blob([`${JSON.stringify(garden, null, 2)}\n`], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = createGardenDefinitionFilename(garden.name);
    link.click();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
    setGardenSaveStatus("Saved JSON file");
  }

  function toggleGardenDefinitionLock() {
    setGarden((current) => ({
      ...current,
      locked: !current.locked,
    }));
  }

  function addBed() {
    if (gardenDefinitionLocked) return;
    setGarden((current) => {
      const defaultBed = createBed(current.beds.length + 1);
      const bed = {
        ...defaultBed,
        ...clampRectToBoundary(
          {
            ...defaultBed,
            x: current.boundary.x + 24,
            y: current.boundary.y + 24,
          },
          current.boundary,
        ),
      };
      setSelectedBedId(bed.id);
      return { ...current, beds: [...current.beds, bed] };
    });
  }

  function deleteSelectedBed() {
    if (gardenDefinitionLocked) return;
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
    if (gardenDefinitionLocked) return;
    setGarden((current) => {
      const defaultZone = createAccessZone(current.accessZones.length + 1);
      const zone = {
        ...defaultZone,
        ...clampRectToBoundary(
          {
            ...defaultZone,
            x: current.boundary.x + 24,
            y: current.boundary.y + 156,
          },
          current.boundary,
        ),
      };
      setSelectedAccessZoneId(zone.id);
      return { ...current, accessZones: [...current.accessZones, zone] };
    });
  }

  function deleteSelectedAccessZone() {
    if (gardenDefinitionLocked) return;
    if (!selectedAccessZoneId) return;
    setGarden((current) => ({
      ...current,
      accessZones: current.accessZones.filter((zone) => zone.id !== selectedAccessZoneId),
    }));
    const nextZone = garden.accessZones.find((zone) => zone.id !== selectedAccessZoneId);
    setSelectedAccessZoneId(nextZone?.id ?? "");
  }

  function updateSelectedBedName(name: string) {
    if (gardenDefinitionLocked) return;
    if (!selectedBedId) return;
    setGarden((current) => ({
      ...current,
      beds: current.beds.map((bed) => (bed.id === selectedBedId ? { ...bed, name } : bed)),
    }));
  }

  function updateSelectedBedSun(sun: SunExposure) {
    if (gardenDefinitionLocked) return;
    if (!selectedBedId) return;
    setGarden((current) => ({
      ...current,
      beds: current.beds.map((bed) => (bed.id === selectedBedId ? { ...bed, sun } : bed)),
    }));
  }

  function updateSelectedBedGeometry(key: keyof RectGeometry, value: number) {
    if (gardenDefinitionLocked) return;
    if (!selectedBed || !Number.isFinite(value)) return;
    const svgValue = metersInputToSvgUnits(value);
    const nextBed = {
      ...selectedBed,
      ...clampRectToBoundary(
        { ...selectedBed, [key]: Math.max(key === "width" || key === "height" ? 1 : 0, svgValue) },
        garden.boundary,
      ),
    };

    setGarden((current) => ({
      ...current,
      beds: current.beds.map((bed) => (bed.id === selectedBed.id ? nextBed : bed)),
    }));
    setPlacements((current) =>
      current.map((placement) =>
        placement.bedId === selectedBed.id
          ? { ...placement, ...clampRectToBed(placement, nextBed) }
          : placement,
      ),
    );
  }

  function updateSelectedAccessZoneName(name: string) {
    if (gardenDefinitionLocked) return;
    if (!selectedAccessZoneId) return;
    setGarden((current) => ({
      ...current,
      accessZones: current.accessZones.map((zone) =>
        zone.id === selectedAccessZoneId ? { ...zone, name } : zone,
      ),
    }));
  }

  function updateSelectedAccessZoneKind(kind: "path" | "access") {
    if (gardenDefinitionLocked) return;
    if (!selectedAccessZoneId) return;
    setGarden((current) => ({
      ...current,
      accessZones: current.accessZones.map((zone) =>
        zone.id === selectedAccessZoneId ? { ...zone, kind } : zone,
      ),
    }));
  }

  function updateSelectedAccessZoneGeometry(key: keyof RectGeometry, value: number) {
    if (gardenDefinitionLocked) return;
    if (!selectedAccessZoneId || !Number.isFinite(value)) return;
    const svgValue = metersInputToSvgUnits(value);

    setGarden((current) => ({
      ...current,
      accessZones: current.accessZones.map((zone) =>
        zone.id === selectedAccessZoneId
          ? {
              ...zone,
              ...clampRectToBoundary(
                { ...zone, [key]: Math.max(key === "width" || key === "height" ? 1 : 0, svgValue) },
                current.boundary,
              ),
            }
          : zone,
      ),
    }));
  }

  function startBoundaryDrag(event: React.PointerEvent<SVGRectElement>) {
    if (gardenDefinitionLocked) return;
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const cursor = point.matrixTransform(svg.getScreenCTM()?.inverse());

    interactionRef.current = {
      type: "move-boundary",
      dx: cursor.x - garden.boundary.x,
      dy: cursor.y - garden.boundary.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedBedId("");
    setSelectedAccessZoneId("");
    setSelectedId(null);
  }

  function startBoundaryResize(event: React.PointerEvent<SVGRectElement>) {
    if (gardenDefinitionLocked) return;
    event.stopPropagation();
    interactionRef.current = {
      type: "resize-boundary",
      startX: garden.boundary.x,
      startY: garden.boundary.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedBedId("");
    setSelectedAccessZoneId("");
    setSelectedId(null);
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
    setActiveSidebarTab("analysis");
  }

  function moveDrag(event: React.PointerEvent<SVGSVGElement>) {
    const activeInteraction = interactionRef.current;
    if (!activeInteraction) return;
    const svg = event.currentTarget;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const cursor = point.matrixTransform(svg.getScreenCTM()?.inverse());
    const definitionInteraction =
      activeInteraction.type === "move-boundary" ||
      activeInteraction.type === "resize-boundary" ||
      activeInteraction.type === "move-bed" ||
      activeInteraction.type === "resize-bed" ||
      activeInteraction.type === "move-access-zone" ||
      activeInteraction.type === "resize-access-zone";

    if (definitionInteraction && gardenDefinitionLocked) {
      interactionRef.current = null;
      return;
    }

    if (activeInteraction.type === "move-boundary") {
      const nextX = cursor.x - activeInteraction.dx;
      const nextY = cursor.y - activeInteraction.dy;
      const deltaX = nextX - garden.boundary.x;
      const deltaY = nextY - garden.boundary.y;

      setGarden((current) => moveGardenDefinition(current, deltaX, deltaY));
      setPlacements((current) =>
        current.map((placement) => ({
          ...placement,
          x: placement.x + deltaX,
          y: placement.y + deltaY,
        })),
      );
      return;
    }

    if (activeInteraction.type === "resize-boundary") {
      setGarden((current) => ({
        ...current,
        boundary: {
          ...current.boundary,
          width: Math.max(48, cursor.x - activeInteraction.startX),
          height: Math.max(48, cursor.y - activeInteraction.startY),
        },
      }));
      return;
    }

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

    if (activeInteraction.type === "move-access-zone") {
      const currentZone = garden.accessZones.find((zone) => zone.id === activeInteraction.id);
      if (!currentZone) return;

      const nextZone = {
        ...currentZone,
        ...clampRectToBoundary(
          {
            ...currentZone,
            x: cursor.x - activeInteraction.dx,
            y: cursor.y - activeInteraction.dy,
          },
          garden.boundary,
        ),
      };

      setGarden((current) => ({
        ...current,
        accessZones: current.accessZones.map((zone) => (zone.id === activeInteraction.id ? nextZone : zone)),
      }));
      return;
    }

    if (activeInteraction.type === "resize-access-zone") {
      const currentZone = garden.accessZones.find((zone) => zone.id === activeInteraction.id);
      if (!currentZone) return;

      const nextZone = {
        ...currentZone,
        ...clampRectToBoundary(
          {
            ...currentZone,
            width: Math.max(24, cursor.x - activeInteraction.startX),
            height: Math.max(24, cursor.y - activeInteraction.startY),
          },
          garden.boundary,
        ),
      };

      setGarden((current) => ({
        ...current,
        accessZones: current.accessZones.map((zone) => (zone.id === activeInteraction.id ? nextZone : zone)),
      }));
      return;
    }

    setPlacements((current) =>
      current.map((placement) => {
        if (placement.id !== activeInteraction.id) return placement;

        if (activeInteraction.type === "move-placement") {
          const currentBed = garden.beds.find((candidate) => candidate.id === placement.bedId);
          if (!currentBed) return placement;
          const candidateX = cursor.x - activeInteraction.dx;
          const candidateY = cursor.y - activeInteraction.dy;
          const targetBed =
            findBedAtPoint(
              candidateX + placement.width / 2,
              candidateY + placement.height / 2,
              garden.beds,
            ) ?? currentBed;
          const footprint = getCropFootprint(cropById[placement.cropId], targetBed);
          const resizedForTargetBed = {
            ...placement,
            bedId: targetBed.id,
            width: footprint.width * placement.columns,
            height: footprint.height * placement.rows,
          };
          const nextRect = clampRectToBed(
            {
              ...resizedForTargetBed,
              x: candidateX,
              y: candidateY,
            },
            targetBed,
          );
          const snappedPoint = snapPointToBedGrid(nextRect, targetBed);
          const snappedRect = clampRectToBed(
            {
              ...nextRect,
              x: snappedPoint.x,
              y: snappedPoint.y,
            },
            targetBed,
          );

          return {
            ...resizedForTargetBed,
            x: snappedRect.x,
            y: snappedRect.y,
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
        const snappedSize = snapRectSizeToBedGrid(clampedSize, bed);
        const clampedSnappedSize = clampRectSizeToBed(
          {
            ...placement,
            ...snappedSize,
          },
          bed,
        );
        const layout = getBlockLayoutFromSize(
          cropById[placement.cropId],
          bed,
          clampedSnappedSize.width,
          clampedSnappedSize.height,
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
    if (gardenDefinitionLocked) return;
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
    setSelectedAccessZoneId("");
    setSelectedId(null);
    setActiveSidebarTab("garden");
  }

  function startBedResize(event: React.PointerEvent<SVGRectElement>, bedId: string) {
    if (gardenDefinitionLocked) return;
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
    setSelectedAccessZoneId("");
    setSelectedId(null);
    setActiveSidebarTab("garden");
  }

  function startAccessZoneDrag(event: React.PointerEvent<SVGRectElement>, zoneId: string) {
    if (gardenDefinitionLocked) return;
    const svg = event.currentTarget.ownerSVGElement;
    const zone = garden.accessZones.find((candidate) => candidate.id === zoneId);
    if (!svg || !zone) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const cursor = point.matrixTransform(svg.getScreenCTM()?.inverse());

    interactionRef.current = {
      type: "move-access-zone",
      id: zone.id,
      dx: cursor.x - zone.x,
      dy: cursor.y - zone.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedAccessZoneId(zone.id);
    setSelectedBedId("");
    setSelectedId(null);
    setActiveSidebarTab("garden");
  }

  function startAccessZoneResize(event: React.PointerEvent<SVGRectElement>, zoneId: string) {
    if (gardenDefinitionLocked) return;
    const zone = garden.accessZones.find((candidate) => candidate.id === zoneId);
    if (!zone) return;
    event.stopPropagation();
    interactionRef.current = {
      type: "resize-access-zone",
      id: zone.id,
      startX: zone.x,
      startY: zone.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedAccessZoneId(zone.id);
    setSelectedBedId("");
    setSelectedId(null);
    setActiveSidebarTab("garden");
  }

  const scaleBarMeters = chooseScaleBarMeters(viewBox);
  const scaleBarWidth = metersToSvgFromScale(scaleBarMeters);
  const scaleMargin = viewBox.width * 0.035;
  const scaleTickHeight = viewBox.height * 0.028;
  const scaleTextSize = viewBox.height * 0.032;
  const scaleBarX = viewBox.x + viewBox.width - scaleBarWidth - scaleMargin;
  const scaleBarY = viewBox.y + viewBox.height - scaleMargin;
  const scaleBarLabel = formatScaleBarLabel(scaleBarMeters);
  const requestedCropIds = new Set(requests.map((request) => request.cropId));
  const cropCategories = getCropCategories(crops);
  const availableCrops = filterCrops(crops, requestedCropIds, {
    search: cropSearch,
    category: cropCategoryFilter,
    sun: cropSunFilter,
    water: cropWaterFilter,
    suitability: cropSuitabilityFilter,
    season: cropSeasonFilter,
    highValueOnly,
  });
  const recommendedCrops = suggestAdditionalCrops(requests, 3);
  const planScore = analyzePlacements(placements, garden.beds, garden.accessZones);
  const placementAnalysis = requests.map((request) => {
    const crop = cropById[request.cropId];
    const cropPlacements = placements.filter((placement) => placement.cropId === request.cropId);
    const plantCount = cropPlacements.reduce((total, placement) => total + placement.plantCount, 0);
    const areaSquareMeters = cropPlacements.reduce(
      (total, placement) => total + calculatePlacementAreaSquareMeters(placement),
      0,
    );
    const yields = cropPlacements.map(describePlacementYield);

    return { request, crop, cropPlacements, plantCount, areaSquareMeters, yields };
  });
  const unplacedRequests = placementAnalysis.filter((analysis) => analysis.cropPlacements.length === 0);

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
            onPointerDown={startBoundaryDrag}
          />
          {garden.beds.map((bed) => (
            <g
              key={bed.id}
              onClick={() => {
                setSelectedBedId(bed.id);
                setSelectedAccessZoneId("");
                setSelectedId(null);
                setActiveSidebarTab("garden");
              }}
            >
              <rect
                x={bed.x}
                y={bed.y}
                width={bed.width}
                height={bed.height}
                rx="5"
                className={selectedBedId === bed.id ? "bed selected-bed" : "bed"}
                onPointerDown={(event) => startBedDrag(event, bed.id)}
              />
              {(() => {
                const grid = getBedGridSize(bed);
                const verticalLines = Math.max(0, Math.floor(bed.width / grid.width) - 1);
                const horizontalLines = Math.max(0, Math.floor(bed.height / grid.height) - 1);

                return (
                  <g className="bed-grid" aria-hidden="true">
                    {Array.from({ length: verticalLines }, (_, index) => {
                      const x = bed.x + grid.width * (index + 1);

                      return (
                        <line
                          key={`${bed.id}-grid-v-${index}`}
                          x1={x}
                          y1={bed.y}
                          x2={x}
                          y2={bed.y + bed.height}
                        />
                      );
                    })}
                    {Array.from({ length: horizontalLines }, (_, index) => {
                      const y = bed.y + grid.height * (index + 1);

                      return (
                        <line
                          key={`${bed.id}-grid-h-${index}`}
                          x1={bed.x}
                          y1={y}
                          x2={bed.x + bed.width}
                          y2={y}
                        />
                      );
                    })}
                  </g>
                );
              })()}
              <text x={bed.x + 12} y={bed.y + 24} className="bed-label">
                {bed.name}
              </text>
              <text x={bed.x + 12} y={bed.y + bed.height - 14} className="bed-meta">
                {getBedLabel(bed)}
              </text>
              {selectedBedId === bed.id && !gardenDefinitionLocked ? (
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

          {garden.accessZones.map((zone) => (
            <g
              key={zone.id}
              onClick={() => {
                setSelectedAccessZoneId(zone.id);
                setSelectedBedId("");
                setSelectedId(null);
                setActiveSidebarTab("garden");
              }}
            >
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.width}
                height={zone.height}
                className={[
                  "access-zone",
                  zone.kind === "access" ? "hard-access-zone" : "path-zone",
                  selectedAccessZoneId === zone.id ? "selected-access-zone" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onPointerDown={(event) => startAccessZoneDrag(event, zone.id)}
              />
              <text
                x={zone.x + 12}
                y={zone.y + 24}
                className={`access-label ${zone.kind === "access" ? "hard-access-label" : "path-label"}`}
              >
                {zone.name}
              </text>
              {selectedAccessZoneId === zone.id && !gardenDefinitionLocked ? (
                <rect
                  x={zone.x + zone.width - 10}
                  y={zone.y + zone.height - 10}
                  width="10"
                  height="10"
                  rx="2"
                  className="access-resize-handle"
                  onPointerDown={(event) => startAccessZoneResize(event, zone.id)}
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
                className={[
                  "placement",
                  selected ? "selected" : "",
                  placement.mode === "interplant" ? "interplant-placement" : "",
                  placement.mode === "border" ? "border-placement" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  setSelectedId(placement.id);
                  setSelectedBedId("");
                  setSelectedAccessZoneId("");
                  setActiveSidebarTab("analysis");
                }}
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
          {!gardenDefinitionLocked ? (
            <rect
              x={garden.boundary.x + garden.boundary.width - 12}
              y={garden.boundary.y + garden.boundary.height - 12}
              width="12"
              height="12"
              rx="2"
              className="boundary-resize-handle"
              onPointerDown={startBoundaryResize}
            />
          ) : null}
          <g className="scale-bar" aria-label={`Scale bar ${scaleBarLabel}`}>
            <line x1={scaleBarX} y1={scaleBarY} x2={scaleBarX + scaleBarWidth} y2={scaleBarY} />
            <line x1={scaleBarX} y1={scaleBarY - scaleTickHeight} x2={scaleBarX} y2={scaleBarY} />
            <line
              x1={scaleBarX + scaleBarWidth}
              y1={scaleBarY - scaleTickHeight}
              x2={scaleBarX + scaleBarWidth}
              y2={scaleBarY}
            />
            <text
              x={scaleBarX + scaleBarWidth / 2}
              y={scaleBarY - scaleTickHeight - scaleTextSize * 0.35}
              fontSize={scaleTextSize}
              className="scale-bar-text"
            >
              {scaleBarLabel}
            </text>
          </g>
        </svg>
      </section>

      <aside className="planner-panel">
        <nav className="sidebar-tabs" aria-label="Sidebar sections">
          {(["garden", "crops", "analysis"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeSidebarTab === tab ? "active" : ""}
              onClick={() => setActiveSidebarTab(tab)}
            >
              {tab === "garden" ? "Garden" : tab === "crops" ? "Crops" : "Analysis"}
            </button>
          ))}
        </nav>

        {activeSidebarTab === "garden" ? (
          <section className="panel-section">
            <h2>Garden definition</h2>
            <label className="field-label">
              Garden name
              <input
                value={garden.name}
                disabled={gardenDefinitionLocked}
                onChange={(event) => updateGardenName(event.target.value)}
              />
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
            <button className="lock-definition-button" type="button" onClick={toggleGardenDefinitionLock}>
              {gardenDefinitionLocked ? <Lock size={18} /> : <LockOpen size={18} />}
              {gardenDefinitionLocked ? "Garden definition locked" : "Lock garden definition"}
            </button>
            <div className="selection-card">
              <strong>Garden area</strong>
              <div className="geometry-grid">
                {(["x", "y", "width", "height"] as const).map((key) => (
                  <label className="field-label" key={key}>
                    {formatGeometryLabel(key)}
                    <input
                      type="number"
                      step="0.01"
                      value={formatMeterCoordinate(garden.boundary[key])}
                      disabled={gardenDefinitionLocked}
                      onChange={(event) =>
                        updateGardenBoundaryGeometry(key, event.currentTarget.valueAsNumber)
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="button-row">
              <button className="primary-action" type="button" onClick={saveGardenDefinition}>
                Save definition
              </button>
              <button
                className="secondary-action"
                type="button"
                disabled={gardenDefinitionLocked}
                onClick={startBlankGarden}
              >
                Blank
              </button>
            </div>
            <p className="save-status">{gardenSaveStatus}</p>
            <div className="button-row">
              <button
                className="secondary-action"
                type="button"
                disabled={gardenDefinitionLocked}
                onClick={resetGardenDefinition}
              >
                Reset
              </button>
              <label className={gardenDefinitionLocked ? "file-button disabled" : "file-button"}>
                Import JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  disabled={gardenDefinitionLocked}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void importGardenDefinitionFromJson(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            <label className={gardenDefinitionLocked ? "file-button disabled" : "file-button"}>
              Import SVG
              <input
                type="file"
                accept=".svg,image/svg+xml"
                disabled={gardenDefinitionLocked}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importGardenFromSvg(file);
                  event.target.value = "";
                }}
              />
            </label>
            <div className="button-row">
              <button
                className="secondary-action"
                type="button"
                disabled={gardenDefinitionLocked}
                onClick={addBed}
              >
                Add bed
              </button>
              <button
                className="secondary-action"
                type="button"
                disabled={gardenDefinitionLocked}
                onClick={addAccessZone}
              >
                Add path
              </button>
            </div>
            {selectedBed ? (
              <div className="selection-card">
                <label className="field-label">
                  Selected bed
                  <input
                    value={selectedBed.name}
                    disabled={gardenDefinitionLocked}
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
                      {formatGeometryLabel(key)}
                      <input
                        type="number"
                        step="0.01"
                        value={formatMeterCoordinate(selectedBed[key])}
                        disabled={gardenDefinitionLocked}
                        onChange={(event) =>
                          updateSelectedBedGeometry(key, event.currentTarget.valueAsNumber)
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="segmented-control" aria-label="Bed sun exposure">
                  <button
                    type="button"
                    className={selectedBed.sun === "full" ? "active" : ""}
                    disabled={gardenDefinitionLocked}
                    onClick={() => updateSelectedBedSun("full")}
                  >
                    Full sun
                  </button>
                  <button
                    type="button"
                    className={selectedBed.sun === "partial" ? "active" : ""}
                    disabled={gardenDefinitionLocked}
                    onClick={() => updateSelectedBedSun("partial")}
                  >
                    Partial
                  </button>
                </div>
                <button
                  className="secondary-action"
                  type="button"
                  disabled={gardenDefinitionLocked}
                  onClick={deleteSelectedBed}
                >
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
                    disabled={gardenDefinitionLocked}
                    onChange={(event) => updateSelectedAccessZoneName(event.target.value)}
                  />
                </label>
                <div className="segmented-control" aria-label="Access zone type">
                  <button
                    type="button"
                    className={selectedAccessZone.kind === "path" ? "active" : ""}
                    disabled={gardenDefinitionLocked}
                    onClick={() => updateSelectedAccessZoneKind("path")}
                  >
                    Path
                  </button>
                  <button
                    type="button"
                    className={selectedAccessZone.kind === "access" ? "active" : ""}
                    disabled={gardenDefinitionLocked}
                    onClick={() => updateSelectedAccessZoneKind("access")}
                  >
                    Access
                  </button>
                </div>
                <div className="geometry-grid">
                  {(["x", "y", "width", "height"] as const).map((key) => (
                    <label className="field-label" key={key}>
                      {formatGeometryLabel(key)}
                      <input
                        type="number"
                        step="0.01"
                        value={formatMeterCoordinate(selectedAccessZone[key])}
                        disabled={gardenDefinitionLocked}
                        onChange={(event) =>
                          updateSelectedAccessZoneGeometry(key, event.currentTarget.valueAsNumber)
                        }
                      />
                    </label>
                  ))}
                </div>
                <button
                  className="secondary-action"
                  type="button"
                  disabled={gardenDefinitionLocked}
                  onClick={deleteSelectedAccessZone}
                >
                  Delete path
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {activeSidebarTab === "crops" ? (
          <section className="panel-section">
            <div className="section-title">
              <Sprout size={18} />
              <h2>Required vegetables</h2>
            </div>
            <label className="field-label people-field">
              <span>
                <Users size={16} />
                People to feed
              </span>
              <input
                type="number"
                min="1"
                max="12"
                step="1"
                value={peopleToFeed}
                onChange={(event) => updatePeopleToFeed(event.currentTarget.valueAsNumber)}
              />
            </label>
            {requests.length > 0 ? (
              <div className="crop-list">
                {requests.map((request) => {
                  const crop = cropById[request.cropId];
                  const gardenValueScore = calculateGardenValueScore(crop);
                  const targetPlantCount = getStarterPlantsForIntent(crop, request.intent, peopleToFeed);
                  const cropPlacementCount = placements.filter(
                    (placement) => placement.cropId === crop.id,
                  ).length;
                  const removableCropPlacementCount = placements.filter(
                    (placement) => placement.cropId === crop.id && !placement.locked,
                  ).length;

                  return (
                    <div className="crop-row selected-crop-row" key={crop.id}>
                      <span className="crop-swatch" style={{ background: crop.color }} />
                      <div>
                        <strong>{crop.name}</strong>
                        <span>
                          {crop.category} - {describeWater(crop.water)}
                        </span>
                        <span>
                          {describeGardenValue(gardenValueScore)} - starter yield{" "}
                          {describeYieldEstimate(crop)}
                        </span>
                        <span>
                          {cropPlacementCount} block{cropPlacementCount === 1 ? "" : "s"} placed
                          {" - "}
                          {targetPlantCount} target plant{targetPlantCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="crop-controls">
                        <select
                          aria-label={`${crop.name} priority`}
                          value={request.priority}
                          onChange={(event) =>
                            updateRequestPriority(
                              crop.id,
                              event.currentTarget.value as CropRequest["priority"],
                            )
                          }
                        >
                          <option value="must">Must have</option>
                          <option value="nice">Nice</option>
                          <option value="optional">Optional</option>
                        </select>
                        <select
                          aria-label={`${crop.name} amount intent`}
                          value={request.intent}
                          onChange={(event) =>
                            updateRequestIntent(crop.id, event.currentTarget.value as CropRequest["intent"])
                          }
                        >
                          <option value="some">{describeCropIntent("some")}</option>
                          <option value="normal">{describeCropIntent("normal")}</option>
                          <option value="lots">{describeCropIntent("lots")}</option>
                        </select>
                        <select
                          aria-label={`${crop.name} placement mode`}
                          value={request.placementMode ?? "auto"}
                          onChange={(event) =>
                            updateRequestPlacementMode(
                              crop.id,
                              event.currentTarget.value as CropRequest["placementMode"],
                            )
                          }
                        >
                          <option value="auto">Auto</option>
                          <option value="standalone">Standalone</option>
                          <option value="interplant">Interplant</option>
                          <option value="border">Border</option>
                        </select>
                        <button
                          className="icon-action"
                          type="button"
                          onClick={() => addCropPlacementBlock(crop.id)}
                          aria-label={`Add ${crop.name} block`}
                          title={`Add ${crop.name} block`}
                        >
                          <Plus size={16} />
                        </button>
                        <button
                          className="icon-action"
                          type="button"
                          disabled={removableCropPlacementCount === 0}
                          onClick={() => deleteLatestCropPlacementBlock(crop.id)}
                          aria-label={`Delete latest ${crop.name} block`}
                          title={`Delete latest ${crop.name} block`}
                        >
                          <Minus size={16} />
                        </button>
                        <button
                          className="icon-action"
                          type="button"
                          onClick={() => removeCropRequest(crop.id)}
                          aria-label={`Remove ${crop.name}`}
                          title={`Remove ${crop.name}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="muted">Add crops to define what the garden must produce this season.</p>
            )}
            <button
              className="secondary-action"
              type="button"
              onClick={() => setCropPickerOpen((open) => !open)}
            >
              Add crop
            </button>
            {cropPickerOpen ? (
              <div className="crop-picker">
                <label className="field-label">
                  Search catalog
                  <input
                    value={cropSearch}
                    onChange={(event) => setCropSearch(event.target.value)}
                    placeholder="Tomato, herb, quick, high-value..."
                  />
                </label>
                <div className="crop-filter-grid">
                  <label className="field-label">
                    Category
                    <select
                      value={cropCategoryFilter}
                      onChange={(event) => setCropCategoryFilter(event.currentTarget.value)}
                    >
                      <option value="all">All</option>
                      {cropCategories.map((category) => (
                        <option value={category} key={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-label">
                    Planting
                    <select
                      value={cropSeasonFilter}
                      onChange={(event) => setCropSeasonFilter(event.currentTarget.value as CropSeasonFilter)}
                    >
                      <option value="all">All</option>
                      <option value="spring">Spring</option>
                      <option value="summer">Summer</option>
                      <option value="autumn">Autumn</option>
                    </select>
                  </label>
                  <label className="field-label">
                    Sun
                    <select
                      value={cropSunFilter}
                      onChange={(event) =>
                        setCropSunFilter(event.currentTarget.value as typeof cropSunFilter)
                      }
                    >
                      <option value="all">All</option>
                      <option value="full">Full</option>
                      <option value="partial">Partial</option>
                    </select>
                  </label>
                  <label className="field-label">
                    Water
                    <select
                      value={cropWaterFilter}
                      onChange={(event) =>
                        setCropWaterFilter(event.currentTarget.value as typeof cropWaterFilter)
                      }
                    >
                      <option value="all">All</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                  <label className="field-label">
                    Fit
                    <select
                      value={cropSuitabilityFilter}
                      onChange={(event) =>
                        setCropSuitabilityFilter(event.currentTarget.value as typeof cropSuitabilityFilter)
                      }
                    >
                      <option value="all">Good or better</option>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                    </select>
                  </label>
                  <label className="checkbox-field compact">
                    <input
                      type="checkbox"
                      checked={highValueOnly}
                      onChange={(event) => setHighValueOnly(event.currentTarget.checked)}
                    />
                    High value
                  </label>
                </div>
                <div className="crop-picker-summary">
                  {availableCrops.length} crop{availableCrops.length === 1 ? "" : "s"} available
                </div>
                <div className="crop-list picker-results">
                  {availableCrops.length > 0 ? (
                    availableCrops.slice(0, 12).map((crop) => {
                      const gardenValueScore = calculateGardenValueScore(crop);

                      return (
                        <button
                          className="crop-option"
                          type="button"
                          key={crop.id}
                          onClick={() => addCropRequest(crop.id)}
                        >
                          <span className="crop-swatch" style={{ background: crop.color }} />
                          <span>
                            <strong>{crop.name}</strong>
                            <span>
                              {describeGardenValue(gardenValueScore)} - {crop.smallGardenSuitability} small
                              garden fit - {describeWater(crop.water)}
                            </span>
                            <span>
                              {crop.plantingWindow} - {describeYieldEstimate(crop)}
                            </span>
                            <span className="source-note">{crop.spacingSource}</span>
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="muted">No crops match the current filters.</p>
                  )}
                </div>
              </div>
            ) : null}
            {recommendedCrops.length > 0 ? (
              <div className="recommendation-list">
                <strong>Potential additions</strong>
                {recommendedCrops.map((suggestion) => (
                  <button
                    className="recommendation-row"
                    type="button"
                    key={suggestion.crop.id}
                    onClick={() => addCropRequest(suggestion.crop.id)}
                  >
                    <span className="crop-swatch" style={{ background: suggestion.crop.color }} />
                    <span>
                      <strong>{suggestion.crop.name}</strong>
                      <span>{suggestion.reasons.slice(0, 2).join(" - ")}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            <button className="primary-action" type="button" onClick={suggestPlan}>
              <Sparkles size={18} />
              Suggest layout
            </button>
          </section>
        ) : null}

        {activeSidebarTab === "analysis" ? (
          <>
            <section className="panel-section">
              <h2>Placement analysis</h2>
              {placements.length > 0 ? (
                <>
                  <div className="score-summary">
                    <strong>{planScore.score}</strong>
                    <span>Layout score</span>
                  </div>
                  <div className="analysis-list">
                    {placementAnalysis.map((analysis) => (
                      <div className="analysis-row" key={analysis.crop.id}>
                        <span className="crop-swatch" style={{ background: analysis.crop.color }} />
                        <div>
                          <strong>{analysis.crop.name}</strong>
                          <span>
                            {analysis.plantCount} plant{analysis.plantCount === 1 ? "" : "s"} placed -{" "}
                            {formatYieldAmount(analysis.areaSquareMeters)} m2
                          </span>
                          <span>
                            {analysis.yields.length > 0
                              ? `Projected yield: ${analysis.yields.join(" + ")}`
                              : "Not placed"}
                          </span>
                        </div>
                      </div>
                    ))}
                    {unplacedRequests.length > 0 ? (
                      <p className="muted">
                        Not placed yet: {unplacedRequests.map((analysis) => analysis.crop.name).join(", ")}.
                      </p>
                    ) : null}
                  </div>
                  <div className="finding-list">
                    <strong>Findings</strong>
                    {planScore.findings.slice(0, 8).map((finding, index) => (
                      <div className={`finding-row ${finding.level}`} key={`${finding.message}-${index}`}>
                        <span>{finding.level}</span>
                        <p>{finding.message}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="muted">Place or suggest crops to calculate plant counts and projected yield.</p>
              )}
            </section>

            <section className="panel-section details-section">
              <h2>Selection</h2>
              {selectedPlacement ? (
                <div className="selection-card">
                  <div>
                    <strong>{cropById[selectedPlacement.cropId].name}</strong>
                    <span>{getCompanionSummary(selectedPlacement, placements)}</span>
                  </div>
                  {planScore.placements.find((score) => score.placementId === selectedPlacement.id) ? (
                    <div className="finding-list compact">
                      {planScore.placements
                        .find((score) => score.placementId === selectedPlacement.id)!
                        .findings.map((finding, index) => (
                          <div className={`finding-row ${finding.level}`} key={`${finding.message}-${index}`}>
                            <span>{finding.level}</span>
                            <p>{finding.message}</p>
                          </div>
                        ))}
                    </div>
                  ) : null}
                  <p>
                    Plants in block: {selectedPlacement.plantCount} ({selectedPlacement.columns} x{" "}
                    {selectedPlacement.rows}).
                  </p>
                  <p>
                    Spacing footprint: {cropById[selectedPlacement.cropId].spacingCm.inRow} x{" "}
                    {cropById[selectedPlacement.cropId].spacingCm.betweenRows} cm.
                  </p>
                  <div className="placement-mode-grid">
                    <p>Placement mode: {selectedPlacement.mode ?? "standalone"}.</p>
                    {(selectedPlacement.mode ?? "standalone") === "interplant" ? (
                      <label className="field-label">
                        Host crop
                        <select
                          value={selectedPlacement.hostPlacementId ?? ""}
                          disabled={selectedPlacement.locked}
                          onChange={(event) =>
                            updatePlacementHost(selectedPlacement.id, event.currentTarget.value)
                          }
                        >
                          <option value="">Choose host</option>
                          {selectedInterplantHosts.map((placement) => (
                            <option value={placement.id} key={placement.id}>
                              {cropById[placement.cropId].name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {(selectedPlacement.mode ?? "standalone") === "interplant" &&
                    selectedInterplantHosts.length === 0 ? (
                      <p className="muted">
                        No compatible host crop in this bed yet. Basil can currently interplant with tomato
                        blocks.
                      </p>
                    ) : null}
                  </div>
                  <p>Projected yield from this block: {describePlacementYield(selectedPlacement)}.</p>
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
                <p className="muted">
                  Select a crop block on the map to review companions and lock it in place.
                </p>
              )}
            </section>

            <section className="panel-section">
              <h2>Plan controls</h2>
              <button className="secondary-action" type="button" onClick={resetPlan}>
                <RotateCcw size={17} />
                Reset draft
              </button>
            </section>
          </>
        ) : null}
      </aside>
    </main>
  );
}
