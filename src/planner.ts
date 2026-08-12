import { beds, centimetersToSvgHeight, centimetersToSvgWidth, type AccessZone, type Bed } from "./garden";
import { cropById, type Crop, type CropId, type CropRequest } from "./cropCatalog";

export type { AccessZone, Bed };
export { cropById } from "./cropCatalog";
export type { Crop, CropId, CropRequest } from "./cropCatalog";

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

export type PlacementFinding = {
  level: "good" | "warning" | "error";
  message: string;
};

export type PlacementScore = {
  placementId: string;
  score: number;
  findings: PlacementFinding[];
};

export type PlanScore = {
  score: number;
  placements: PlacementScore[];
  findings: PlacementFinding[];
};

function rectsOverlap(left: Placement, right: Placement | AccessZone) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
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

export function getStarterPlantsForIntent(crop: Crop, intent: CropRequest["intent"]) {
  const defaultPlants = getDefaultPlantsPerBlock(crop);
  if (intent === "some") return Math.max(1, Math.ceil(defaultPlants / 2));
  if (intent === "lots") return defaultPlants * 2;
  return defaultPlants;
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

export function analyzePlacements(
  placements: Placement[],
  gardenBeds = beds,
  accessZones: AccessZone[] = [],
): PlanScore {
  const placementScores = placements.map((placement): PlacementScore => {
    const crop = cropById[placement.cropId];
    const bed = gardenBeds.find((candidate) => candidate.id === placement.bedId);
    const findings: PlacementFinding[] = [];
    let score = 100;

    if (!bed) {
      findings.push({ level: "error", message: "Placement is assigned to a missing bed." });
      score -= 45;
    } else {
      const insideBed =
        placement.x >= bed.x &&
        placement.y >= bed.y &&
        placement.x + placement.width <= bed.x + bed.width &&
        placement.y + placement.height <= bed.y + bed.height;

      if (!insideBed) {
        findings.push({ level: "error", message: "Placement extends outside its bed." });
        score -= 35;
      }

      if (bed.sun !== crop.sun) {
        findings.push({
          level: "warning",
          message: `${crop.name} prefers ${crop.sun} sun; ${bed.name} is marked ${bed.sun}.`,
        });
        score -= 18;
      }
    }

    const overlappingZones = accessZones.filter((zone) => rectsOverlap(placement, zone));
    for (const zone of overlappingZones) {
      findings.push({
        level: "error",
        message:
          zone.kind === "path"
            ? `Overlaps soft crop path "${zone.name}".`
            : `Overlaps hard access "${zone.name}".`,
      });
      score -= zone.kind === "path" ? 18 : 30;
    }

    const neighbors = placements.filter(
      (other) => other.id !== placement.id && other.bedId === placement.bedId,
    );
    const goodCompanions = neighbors.filter((neighbor) => crop.companions.includes(neighbor.cropId));
    const badCompanions = neighbors.filter((neighbor) => crop.avoid.includes(neighbor.cropId));

    if (badCompanions.length > 0) {
      findings.push({
        level: "error",
        message: `Avoid near ${badCompanions.map((neighbor) => cropById[neighbor.cropId].name).join(", ")}.`,
      });
      score -= 28;
    }

    if (goodCompanions.length > 0) {
      findings.push({
        level: "good",
        message: `Good companion near ${goodCompanions
          .map((neighbor) => cropById[neighbor.cropId].name)
          .join(", ")}.`,
      });
      score += 8;
    }

    if (findings.length === 0) {
      findings.push({ level: "good", message: "No placement issues detected." });
    }

    return {
      placementId: placement.id,
      score: clampScore(score),
      findings,
    };
  });
  const allFindings = placementScores.flatMap((placementScore) => placementScore.findings);
  const score =
    placementScores.length > 0
      ? Math.round(
          placementScores.reduce((total, placementScore) => total + placementScore.score, 0) /
            placementScores.length,
        )
      : 100;

  return {
    score,
    placements: placementScores,
    findings: allFindings,
  };
}

export function createSuggestions(
  requests: CropRequest[],
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

  for (const request of requests) {
    const { cropId } = request;
    const crop = cropById[cropId];
    if (locked.some((placement) => placement.cropId === cropId)) continue;

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

    const plantCount = getStarterPlantsForIntent(crop, request.intent);
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
      id: `${cropId}-${idSeed}-0`,
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
      reason: `${preferredBed.name} matches ${crop.sun} sun and starts a ${request.intent} ${crop.name.toLowerCase()} area with ${plantCount} plant${plantCount === 1 ? "" : "s"} at ${crop.spacingCm.inRow} x ${crop.spacingCm.betweenRows} cm spacing.`,
    });
  }

  return suggestions;
}
