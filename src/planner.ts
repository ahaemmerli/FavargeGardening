import { beds, type Bed, type AccessZone } from "./garden";

export type CropId = "tomato" | "basil" | "carrot" | "lettuce" | "bean" | "cabbage";

export type Crop = {
  id: CropId;
  name: string;
  family: string;
  water: "low" | "medium" | "high";
  sun: "partial" | "full";
  color: string;
  companions: CropId[];
  avoid: CropId[];
};

export type { AccessZone, Bed };

export type CropRequest = Record<CropId, number>;

export type Placement = {
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

export const crops: Crop[] = [
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

export const cropById = Object.fromEntries(crops.map((crop) => [crop.id, crop])) as Record<CropId, Crop>;

export function describeWater(water: Crop["water"]) {
  return water === "high" ? "High water" : water === "medium" ? "Moderate water" : "Low water";
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

export function createSuggestions(requests: CropRequest, existing: Placement[], idSeed = Date.now()) {
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
        beds.find(
          (bed) =>
            bed.sun === crop.sun &&
            !suggestions.some(
              (placement) => crop.avoid.includes(placement.cropId) && placement.bedId === bed.id,
            ),
        ) ??
        beds.find(
          (bed) =>
            !suggestions.some(
              (placement) => crop.avoid.includes(placement.cropId) && placement.bedId === bed.id,
            ),
        ) ??
        beds[0];

      const offset = bedOffsets.get(preferredBed.id) ?? 0;
      const width = crop.id === "basil" || crop.id === "lettuce" ? 70 : 90;
      const height = crop.id === "bean" || crop.id === "tomato" ? 62 : 52;
      const columns = Math.max(1, Math.floor((preferredBed.width - 28) / 98));
      const column = offset % columns;
      const row = Math.floor(offset / columns);

      bedOffsets.set(preferredBed.id, offset + 1);
      suggestions.push({
        id: `${cropId}-${idSeed}-${index}`,
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
