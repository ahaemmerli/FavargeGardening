import { beds, centimetersToSvgHeight, centimetersToSvgWidth, type AccessZone, type Bed } from "./garden";

export type CropId = "tomato" | "basil" | "carrot" | "lettuce" | "bean" | "cabbage";

export type Crop = {
  id: CropId;
  name: string;
  family: string;
  water: "low" | "medium" | "high";
  sun: "partial" | "full";
  color: string;
  spacingCm: {
    inRow: number;
    betweenRows: number;
  };
  spacingSource: string;
  companions: CropId[];
  avoid: CropId[];
};

export type { AccessZone, Bed };

export type CropRequest = Record<CropId, number>;

export type Placement = {
  id: string;
  cropId: CropId;
  bedId: string;
  plantCount: number;
  columns: number;
  rows: number;
  x: number;
  y: number;
  width: number;
  height: number;
  locked: boolean;
  reason: string;
};

export const crops: Crop[] = [
  {
    id: "tomato",
    name: "Tomato",
    family: "Nightshade",
    water: "high",
    sun: "full",
    color: "#d94f38",
    spacingCm: { inRow: 60, betweenRows: 60 },
    spacingSource: "Starter catalog: NC State intensive tomato spacing rounded to 60 cm.",
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
    spacingCm: { inRow: 25, betweenRows: 25 },
    spacingSource: "Starter catalog: herb spacing placeholder, to verify against seed data.",
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
    spacingCm: { inRow: 10, betweenRows: 30 },
    spacingSource: "Starter catalog: RHS carrot spacing.",
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
    spacingCm: { inRow: 25, betweenRows: 30 },
    spacingSource: "Starter catalog: RHS raised-bed lettuce spacing.",
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
    spacingCm: { inRow: 10, betweenRows: 45 },
    spacingSource: "Starter catalog: RHS French bean spacing.",
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
    spacingCm: { inRow: 45, betweenRows: 45 },
    spacingSource: "Starter catalog: CSU cabbage spacing rounded from 18 inches.",
    companions: ["bean"],
    avoid: ["tomato"],
  },
];

export const cropById = Object.fromEntries(crops.map((crop) => [crop.id, crop])) as Record<CropId, Crop>;

export function describeWater(water: Crop["water"]) {
  return water === "high" ? "High water" : water === "medium" ? "Moderate water" : "Low water";
}

export function getCropFootprint(crop: Crop, bed: Bed) {
  return {
    width: centimetersToSvgWidth(bed, crop.spacingCm.betweenRows),
    height: centimetersToSvgHeight(bed, crop.spacingCm.inRow),
  };
}

export function getDefaultPlantsPerBlock(crop: Crop) {
  if (crop.spacingCm.inRow <= 12) return 12;
  if (crop.spacingCm.inRow <= 25) return 4;
  return 1;
}

export function getBlockLayout(crop: Crop, bed: Bed, plantCount: number) {
  const footprint = getCropFootprint(crop, bed);
  const columns = Math.max(1, Math.ceil(Math.sqrt(plantCount)));
  const rows = Math.max(1, Math.ceil(plantCount / columns));

  return {
    columns,
    rows,
    width: footprint.width * columns,
    height: footprint.height * rows,
  };
}

export function getBlockLayoutFromSize(crop: Crop, bed: Bed, width: number, height: number) {
  const footprint = getCropFootprint(crop, bed);
  const columns = Math.max(1, Math.round(width / footprint.width));
  const rows = Math.max(1, Math.round(height / footprint.height));

  return {
    columns,
    rows,
    plantCount: columns * rows,
    width: footprint.width * columns,
    height: footprint.height * rows,
  };
}

export function getCompanionSummary(placement: Placement, placements: Placement[]) {
  const crop = cropById[placement.cropId];
  const neighbors = placements.filter(
    (other) => other.id !== placement.id && other.bedId === placement.bedId,
  );
  const good = neighbors
    .filter((other) => crop.companions.includes(other.cropId))
    .map((other) => cropById[other.cropId].name);
  const bad = neighbors
    .filter((other) => crop.avoid.includes(other.cropId))
    .map((other) => cropById[other.cropId].name);

  if (bad.length > 0) return `Avoid near ${bad.join(", ")}`;
  if (good.length > 0) return `Good companion: ${good.join(", ")}`;
  return "No companion conflict";
}

export function createSuggestions(
  requests: CropRequest,
  existing: Placement[],
  idSeed = Date.now(),
  gardenBeds = beds,
) {
  const locked = existing.filter((placement) => placement.locked);
  const suggestions: Placement[] = [...locked];
  const bedOffsets = new Map<string, number>();

  if (gardenBeds.length === 0) return suggestions;

  for (const placement of locked) {
    const count = bedOffsets.get(placement.bedId) ?? 0;
    bedOffsets.set(placement.bedId, count + 1);
  }

  for (const [cropId, count] of Object.entries(requests) as [CropId, number][]) {
    if (count <= 0) continue;

    const crop = cropById[cropId];
    const alreadyLocked = locked.filter((placement) => placement.cropId === cropId).length;
    const lockedPlantCount = locked
      .filter((placement) => placement.cropId === cropId)
      .reduce((total, placement) => total + placement.plantCount, 0);
    let missingPlants = Math.max(0, count - Math.max(alreadyLocked, lockedPlantCount));
    let blockIndex = 0;

    while (missingPlants > 0) {
      const preferredBed =
        gardenBeds.find(
          (bed) =>
            bed.sun === crop.sun &&
            !suggestions.some(
              (placement) => crop.avoid.includes(placement.cropId) && placement.bedId === bed.id,
            ),
        ) ??
        gardenBeds.find(
          (bed) =>
            !suggestions.some(
              (placement) => crop.avoid.includes(placement.cropId) && placement.bedId === bed.id,
            ),
        ) ??
        gardenBeds[0];

      const plantCount = Math.min(missingPlants, getDefaultPlantsPerBlock(crop));
      const offset = bedOffsets.get(preferredBed.id) ?? 0;
      const layout = getBlockLayout(crop, preferredBed, plantCount);
      const width = layout.width;
      const height = layout.height;
      const gap = 8;
      const columns = Math.max(1, Math.floor((preferredBed.width - 28 + gap) / (width + gap)));
      const column = offset % columns;
      const row = Math.floor(offset / columns);

      bedOffsets.set(preferredBed.id, offset + 1);
      suggestions.push({
        id: `${cropId}-${idSeed}-${blockIndex}`,
        cropId,
        bedId: preferredBed.id,
        plantCount,
        columns: layout.columns,
        rows: layout.rows,
        x: preferredBed.x + 14 + column * (width + gap),
        y: preferredBed.y + 14 + row * (height + gap),
        width,
        height,
        locked: false,
        reason: `${preferredBed.name} matches ${crop.sun} sun and places ${plantCount} plant${plantCount === 1 ? "" : "s"} at ${crop.spacingCm.inRow} x ${crop.spacingCm.betweenRows} cm spacing.`,
      });
      missingPlants -= plantCount;
      blockIndex += 1;
    }
  }

  return suggestions;
}
