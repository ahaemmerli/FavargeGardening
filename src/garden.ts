export type SunExposure = "partial" | "full";

export type RectGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Bed = RectGeometry & {
  id: string;
  name: string;
  labelWidthMeters?: number;
  labelHeightMeters?: number;
  sun: SunExposure;
};

export type AccessZone = RectGeometry & {
  id: string;
  name: string;
  kind: "path" | "access";
};

export type GardenViewBox = RectGeometry;

export type GardenDefinition = {
  id: string;
  name: string;
  sourceDrawing: string;
  scaleDescription: string;
  locked: boolean;
  boundary: RectGeometry;
  beds: Bed[];
  accessZones: AccessZone[];
};

export type SavedGardenDefinition = Partial<Omit<GardenDefinition, "beds" | "accessZones">> & {
  beds?: Partial<Bed>[];
  accessZones?: Partial<AccessZone>[];
};

export const defaultGardenViewBox: GardenViewBox = {
  x: 50,
  y: 38,
  width: 730,
  height: 442,
};

export const gardenBoundary: RectGeometry = {
  x: 64,
  y: 48,
  width: 704,
  height: 422,
};

export const svgUnitsPerDrawingMm = 96 / 25.4;
export const realMmPerDrawingMm = 50;
export const cropPlacementGridCm = 10;

export const beds: Bed[] = [
  {
    id: "left-lower",
    name: "Left lower bed",
    x: 93.92,
    y: 341.14,
    width: 225.79,
    height: 74.61,
    labelWidthMeters: 3,
    labelHeightMeters: 1,
    sun: "full",
  },
  {
    id: "right-upper",
    name: "Right upper bed",
    x: 378.1,
    y: 125.33,
    width: 377.95,
    height: 94.49,
    labelWidthMeters: 5,
    labelHeightMeters: 1.25,
    sun: "full",
  },
  {
    id: "right-middle",
    name: "Right middle bed",
    x: 378.1,
    y: 219.82,
    width: 377.95,
    height: 94.49,
    labelWidthMeters: 5,
    labelHeightMeters: 1.25,
    sun: "full",
  },
  {
    id: "right-lower",
    name: "Right lower bed",
    x: 378.1,
    y: 314.31,
    width: 377.95,
    height: 94.49,
    labelWidthMeters: 5,
    labelHeightMeters: 1.25,
    sun: "full",
  },
];

export const accessZones: AccessZone[] = [
  {
    id: "left-main-access",
    name: "Left access",
    kind: "access",
    x: 93.99,
    y: 56.08,
    width: 224.33,
    height: 284.05,
  },
  {
    id: "central-access",
    name: "Central path",
    kind: "path",
    x: 319.43,
    y: 56.05,
    width: 60.31,
    height: 403.73,
  },
  { id: "top-access", name: "Top path", kind: "path", x: 379.71, y: 56.05, width: 376.35, height: 69.29 },
  {
    id: "right-bottom-access",
    name: "Right bottom path",
    kind: "path",
    x: 379.55,
    y: 408.64,
    width: 376.67,
    height: 51.27,
  },
  {
    id: "left-bottom-access",
    name: "Left bottom path",
    kind: "path",
    x: 93.92,
    y: 415.75,
    width: 225.79,
    height: 44.02,
  },
];

export const defaultGardenDefinition: GardenDefinition = {
  id: "favarge",
  name: "Favarge garden",
  sourceDrawing: "favargemap.svg",
  scaleDescription: "1 drawing mm = 50 real mm",
  locked: false,
  boundary: gardenBoundary,
  beds,
  accessZones,
};

export function createDefaultGardenDefinition(): GardenDefinition {
  return {
    ...defaultGardenDefinition,
    boundary: { ...defaultGardenDefinition.boundary },
    beds: defaultGardenDefinition.beds.map((bed) => ({ ...bed })),
    accessZones: defaultGardenDefinition.accessZones.map((zone) => ({ ...zone })),
  };
}

export function createBlankGardenDefinition(): GardenDefinition {
  return {
    id: `garden-${Date.now()}`,
    name: "New garden",
    sourceDrawing: "manual",
    scaleDescription: "1 drawing mm = 50 real mm",
    locked: false,
    boundary: { ...gardenBoundary },
    beds: [],
    accessZones: [],
  };
}

export function createBed(index: number): Bed {
  return {
    id: `bed-${Date.now()}-${index}`,
    name: `Bed ${index}`,
    x: gardenBoundary.x + 24,
    y: gardenBoundary.y + 24,
    width: metersToSvgFromScale(2),
    height: metersToSvgFromScale(1),
    sun: "full",
  };
}

export function createAccessZone(index: number): AccessZone {
  return {
    id: `access-${Date.now()}-${index}`,
    name: `Path ${index}`,
    kind: "path",
    x: gardenBoundary.x + 24,
    y: gardenBoundary.y + 156,
    width: metersToSvgFromScale(2),
    height: metersToSvgFromScale(0.5),
  };
}

function numberOrFallback(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringOrFallback(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeRectGeometry(
  value: Partial<RectGeometry> | undefined,
  fallback: RectGeometry,
): RectGeometry {
  return {
    x: numberOrFallback(value?.x, fallback.x),
    y: numberOrFallback(value?.y, fallback.y),
    width: Math.max(1, numberOrFallback(value?.width, fallback.width)),
    height: Math.max(1, numberOrFallback(value?.height, fallback.height)),
  };
}

export function normalizeGardenDefinition(
  value: SavedGardenDefinition | undefined,
  fallback = createDefaultGardenDefinition(),
): GardenDefinition {
  const importedBeds = Array.isArray(value?.beds) ? value.beds : fallback.beds;
  const importedAccessZones = Array.isArray(value?.accessZones) ? value.accessZones : fallback.accessZones;

  return {
    id: stringOrFallback(value?.id, fallback.id),
    name: stringOrFallback(value?.name, fallback.name),
    sourceDrawing: stringOrFallback(value?.sourceDrawing, fallback.sourceDrawing),
    scaleDescription: stringOrFallback(value?.scaleDescription, fallback.scaleDescription),
    locked: typeof value?.locked === "boolean" ? value.locked : fallback.locked,
    boundary: normalizeRectGeometry(value?.boundary, fallback.boundary),
    beds: importedBeds.map((bed, index) => ({
      ...normalizeRectGeometry(bed, fallback.beds[index] ?? createBed(index + 1)),
      id: stringOrFallback(bed.id, `bed-${index + 1}`),
      name: stringOrFallback(bed.name, `Bed ${index + 1}`),
      labelWidthMeters: optionalNumber(bed.labelWidthMeters),
      labelHeightMeters: optionalNumber(bed.labelHeightMeters),
      sun: bed.sun === "partial" ? "partial" : "full",
    })),
    accessZones: importedAccessZones.map((zone, index) => ({
      ...normalizeRectGeometry(zone, fallback.accessZones[index] ?? createAccessZone(index + 1)),
      id: stringOrFallback(zone.id, `access-${index + 1}`),
      name: stringOrFallback(zone.name, `Path ${index + 1}`),
      kind: zone.kind === "access" ? "access" : "path",
    })),
  };
}

export function parseGardenDefinitionFromSvg(svgText: string, sourceDrawing: string): GardenDefinition {
  const rects = [...svgText.matchAll(/<rect\b[^>]*>/gi)].map((match) => match[0]);
  const parsedRects = rects
    .map((rect) => ({
      id: readSvgAttribute(rect, "id"),
      fill: readSvgFill(rect),
      x: Number(readSvgAttribute(rect, "x")),
      y: Number(readSvgAttribute(rect, "y")),
      width: Number(readSvgAttribute(rect, "width")),
      height: Number(readSvgAttribute(rect, "height")),
    }))
    .filter(
      (rect) => Number.isFinite(rect.x) && Number.isFinite(rect.y) && rect.width > 0 && rect.height > 0,
    );

  const importedBeds = parsedRects
    .filter((rect) => rect.fill === "#ffffff" || rect.fill === "white")
    .map((rect, index): Bed => ({
      id: rect.id || `imported-bed-${index + 1}`,
      name: `Bed ${index + 1}`,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      sun: "full",
    }));
  const importedAccessZones = parsedRects
    .filter((rect) => rect.fill === "#00ff00" || rect.fill === "lime")
    .map((rect, index): AccessZone => ({
      id: rect.id || `imported-access-${index + 1}`,
      name: `Path ${index + 1}`,
      kind: index === 0 ? "access" : "path",
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    }));

  return {
    ...createDefaultGardenDefinition(),
    id: `imported-${Date.now()}`,
    name: sourceDrawing.replace(/\.[^.]+$/, "") || "Imported garden",
    sourceDrawing,
    beds: importedBeds,
    accessZones: importedAccessZones,
  };
}

export function getBedLabel(bed: Bed) {
  const width = svgUnitsToRealMeters(bed.width);
  const height = svgUnitsToRealMeters(bed.height);

  return `${formatMeters(width)} m x ${formatMeters(height)} m`;
}

export function svgUnitsPerMeterX(bed: Bed) {
  return bed.width / svgUnitsToRealMeters(bed.width);
}

export function svgUnitsPerMeterY(bed: Bed) {
  return bed.height / svgUnitsToRealMeters(bed.height);
}

export function metersToSvgWidth(bed: Bed, meters: number) {
  return meters * svgUnitsPerMeterX(bed);
}

export function metersToSvgHeight(bed: Bed, meters: number) {
  return meters * svgUnitsPerMeterY(bed);
}

export function metersToSvgFromScale(meters: number) {
  return (meters * 1000 * svgUnitsPerDrawingMm) / realMmPerDrawingMm;
}

export function chooseScaleBarMeters(viewBox: GardenViewBox) {
  const maxBarWidth = viewBox.width * 0.24;
  const candidates = [5, 2, 1, 0.5, 0.25, 0.1];

  return candidates.find((meters) => metersToSvgFromScale(meters) <= maxBarWidth) ?? 0.1;
}

export function formatScaleBarLabel(meters: number) {
  if (meters >= 1) return `${Number(meters.toFixed(2)).toString()} m`;

  return `${Number((meters * 100).toFixed(1)).toString()} cm`;
}

export function centimetersToSvgWidth(bed: Bed, centimeters: number) {
  return metersToSvgWidth(bed, centimeters / 100);
}

export function centimetersToSvgHeight(bed: Bed, centimeters: number) {
  return metersToSvgHeight(bed, centimeters / 100);
}

export function getBedGridSize(bed: Bed, gridSizeCm = cropPlacementGridCm) {
  return {
    width: centimetersToSvgWidth(bed, gridSizeCm),
    height: centimetersToSvgHeight(bed, gridSizeCm),
  };
}

function snapValueToGrid(value: number, origin: number, step: number) {
  if (step <= 0) return value;

  return origin + Math.round((value - origin) / step) * step;
}

export function snapPointToBedGrid(
  point: Pick<RectGeometry, "x" | "y">,
  bed: Bed,
  gridSizeCm = cropPlacementGridCm,
) {
  const grid = getBedGridSize(bed, gridSizeCm);

  return {
    x: snapValueToGrid(point.x, bed.x, grid.width),
    y: snapValueToGrid(point.y, bed.y, grid.height),
  };
}

export function snapRectSizeToBedGrid(
  rect: Pick<RectGeometry, "width" | "height">,
  bed: Bed,
  gridSizeCm = cropPlacementGridCm,
) {
  const grid = getBedGridSize(bed, gridSizeCm);

  return {
    width: Math.max(grid.width, Math.round(rect.width / grid.width) * grid.width),
    height: Math.max(grid.height, Math.round(rect.height / grid.height) * grid.height),
  };
}

export function svgUnitsToDrawingMm(svgUnits: number) {
  return svgUnits / svgUnitsPerDrawingMm;
}

export function drawingMmToRealMeters(drawingMm: number) {
  return (drawingMm * realMmPerDrawingMm) / 1000;
}

export function svgUnitsToRealMeters(svgUnits: number) {
  return drawingMmToRealMeters(svgUnitsToDrawingMm(svgUnits));
}

function formatMeters(meters: number) {
  const roundedQuarter = Math.round(meters * 4) / 4;
  if (Math.abs(meters - roundedQuarter) < 0.025) {
    return Number(roundedQuarter.toFixed(2)).toString();
  }

  return Number(meters.toFixed(2)).toString();
}

function readSvgAttribute(markup: string, name: string) {
  return new RegExp(`\\b${name}="([^"]*)"`, "i").exec(markup)?.[1] ?? "";
}

function readSvgFill(markup: string) {
  const directFill = readSvgAttribute(markup, "fill");
  const style = readSvgAttribute(markup, "style");
  const styleFill = /(?:^|;)fill:([^;]+)/i.exec(style)?.[1]?.trim() ?? "";

  return (directFill || styleFill).toLowerCase();
}

export function isRectInsideBed(rect: RectGeometry, bed: Bed) {
  return (
    rect.x >= bed.x &&
    rect.y >= bed.y &&
    rect.x + rect.width <= bed.x + bed.width &&
    rect.y + rect.height <= bed.y + bed.height
  );
}

export function clampRectToBed(rect: RectGeometry, bed: Bed): RectGeometry {
  const width = Math.min(rect.width, bed.width);
  const height = Math.min(rect.height, bed.height);

  return {
    ...rect,
    width,
    height,
    x: Math.max(bed.x, Math.min(bed.x + bed.width - width, rect.x)),
    y: Math.max(bed.y, Math.min(bed.y + bed.height - height, rect.y)),
  };
}

export function clampRectSizeToBed(rect: RectGeometry, bed: Bed): RectGeometry {
  return {
    ...rect,
    width: Math.max(1, Math.min(rect.width, bed.x + bed.width - rect.x)),
    height: Math.max(1, Math.min(rect.height, bed.y + bed.height - rect.y)),
  };
}

export function clampRectToBoundary(rect: RectGeometry, boundary: RectGeometry): RectGeometry {
  const width = Math.max(1, Math.min(rect.width, boundary.width));
  const height = Math.max(1, Math.min(rect.height, boundary.height));

  return {
    ...rect,
    width,
    height,
    x: Math.max(boundary.x, Math.min(boundary.x + boundary.width - width, rect.x)),
    y: Math.max(boundary.y, Math.min(boundary.y + boundary.height - height, rect.y)),
  };
}

export function findContainingBed(rect: RectGeometry, candidates = beds) {
  return candidates.find((bed) => isRectInsideBed(rect, bed));
}

export function findBedAtPoint(x: number, y: number, candidates = beds) {
  return candidates.find(
    (bed) => x >= bed.x && y >= bed.y && x <= bed.x + bed.width && y <= bed.y + bed.height,
  );
}

export function zoomViewBox(viewBox: GardenViewBox, factor: number): GardenViewBox {
  const nextWidth = viewBox.width * factor;
  const nextHeight = viewBox.height * factor;
  const centerX = viewBox.x + viewBox.width / 2;
  const centerY = viewBox.y + viewBox.height / 2;

  return {
    x: centerX - nextWidth / 2,
    y: centerY - nextHeight / 2,
    width: nextWidth,
    height: nextHeight,
  };
}

export function panViewBox(viewBox: GardenViewBox, dx: number, dy: number): GardenViewBox {
  return {
    ...viewBox,
    x: viewBox.x + dx,
    y: viewBox.y + dy,
  };
}
