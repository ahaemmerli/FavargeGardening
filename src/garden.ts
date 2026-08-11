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
  realWidthMeters: number;
  realHeightMeters: number;
  sun: SunExposure;
};

export type AccessZone = RectGeometry & {
  id: string;
  name: string;
};

export type GardenViewBox = RectGeometry;

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

export const beds: Bed[] = [
  {
    id: "left-lower",
    name: "Left lower bed",
    x: 75.76,
    y: 341.18,
    width: 243.86,
    height: 69.14,
    realWidthMeters: 3,
    realHeightMeters: 1,
    sun: "full",
  },
  {
    id: "right-upper",
    name: "Right upper bed",
    x: 378.1,
    y: 125.33,
    width: 377.95,
    height: 94.49,
    realWidthMeters: 5,
    realHeightMeters: 1.25,
    sun: "full",
  },
  {
    id: "right-middle",
    name: "Right middle bed",
    x: 378.1,
    y: 219.82,
    width: 377.95,
    height: 94.49,
    realWidthMeters: 5,
    realHeightMeters: 1.25,
    sun: "full",
  },
  {
    id: "right-lower",
    name: "Right lower bed",
    x: 378.1,
    y: 314.31,
    width: 377.95,
    height: 94.49,
    realWidthMeters: 5,
    realHeightMeters: 1.25,
    sun: "full",
  },
];

export const accessZones: AccessZone[] = [
  { id: "left-main-access", name: "Access", x: 74.68, y: 56.1, width: 243.62, height: 284 },
  { id: "central-access", name: "Access", x: 319.43, y: 56.05, width: 60.31, height: 403.56 },
  { id: "top-access", name: "Access", x: 379.71, y: 56.05, width: 376.35, height: 69.29 },
  { id: "right-bottom-access", name: "Access", x: 379.55, y: 408.63, width: 376.67, height: 51.1 },
  { id: "left-bottom-access", name: "Access", x: 75.69, y: 410.29, width: 244, height: 49.61 },
];

export function getBedLabel(bed: Bed) {
  return `${bed.realWidthMeters} m x ${bed.realHeightMeters} m`;
}

export function svgUnitsPerMeterX(bed: Bed) {
  return bed.width / bed.realWidthMeters;
}

export function svgUnitsPerMeterY(bed: Bed) {
  return bed.height / bed.realHeightMeters;
}

export function metersToSvgWidth(bed: Bed, meters: number) {
  return meters * svgUnitsPerMeterX(bed);
}

export function metersToSvgHeight(bed: Bed, meters: number) {
  return meters * svgUnitsPerMeterY(bed);
}

export function isRectInsideBed(rect: RectGeometry, bed: Bed) {
  return (
    rect.x >= bed.x &&
    rect.y >= bed.y &&
    rect.x + rect.width <= bed.x + bed.width &&
    rect.y + rect.height <= bed.y + bed.height
  );
}

export function findContainingBed(rect: RectGeometry) {
  return beds.find((bed) => isRectInsideBed(rect, bed));
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
