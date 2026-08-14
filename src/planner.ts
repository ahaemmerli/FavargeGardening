import {
  beds,
  centimetersToSvgHeight,
  centimetersToSvgWidth,
  getBedGridSize,
  metersToSvgFromScale,
  type AccessZone,
  type Bed,
} from "./garden";
import { cropById, tomatoCropIds, type Crop, type CropId, type CropRequest } from "./cropCatalog";

export type { AccessZone, Bed };
export { cropById } from "./cropCatalog";
export type { Crop, CropId, CropRequest } from "./cropCatalog";

export type PlacementMode = "standalone" | "interplant" | "border";
export type PlacementStatus = "planned" | "planted" | "harvested" | "removed";

export type Placement = {
  id: string;
  cropId: CropId;
  bedId: string;
  mode?: PlacementMode;
  hostPlacementId?: string;
  status?: PlacementStatus;
  plannedStartDate?: string;
  plantedDate?: string;
  harvestDate?: string;
  removedDate?: string;
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
  const overlap = getRectOverlap(left, right);

  return overlap.width > 0 && overlap.height > 0;
}

function getRectOverlap(left: Placement, right: Placement | AccessZone) {
  const x = Math.max(left.x, right.x);
  const y = Math.max(left.y, right.y);
  const rightEdge = Math.min(left.x + left.width, right.x + right.width);
  const bottomEdge = Math.min(left.y + left.height, right.y + right.height);

  return {
    x,
    y,
    width: Math.max(0, rightEdge - x),
    height: Math.max(0, bottomEdge - y),
  };
}

function placementOverlapsZone(placement: Placement, zone: AccessZone) {
  const overlap = getRectOverlap(placement, zone);
  if (overlap.width <= 0 || overlap.height <= 0) return false;
  if (zone.kind === "access") return true;

  const softPathEdgeTolerance = metersToSvgFromScale(0.05);

  return overlap.width > softPathEdgeTolerance && overlap.height > softPathEdgeTolerance;
}

function getPlacementMode(placement: Placement): PlacementMode {
  return placement.mode ?? "standalone";
}

function getPlacementStatus(placement: Placement): PlacementStatus {
  return placement.status ?? "planned";
}

function isHistoricalPlacement(placement: Placement) {
  const status = getPlacementStatus(placement);

  return status === "harvested" || status === "removed";
}

function normalizeDateValue(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export function placementsOverlapInTime(left: Placement, right: Placement) {
  const leftStatus = getPlacementStatus(left);
  const rightStatus = getPlacementStatus(right);
  const leftStart = normalizeDateValue(left.plantedDate) ?? normalizeDateValue(left.plannedStartDate);
  const rightStart = normalizeDateValue(right.plantedDate) ?? normalizeDateValue(right.plannedStartDate);
  const leftEnd = normalizeDateValue(left.removedDate) ?? normalizeDateValue(left.harvestDate);
  const rightEnd = normalizeDateValue(right.removedDate) ?? normalizeDateValue(right.harvestDate);

  if ((leftStatus === "removed" || leftStatus === "harvested") && !leftStart && !leftEnd) return false;
  if ((rightStatus === "removed" || rightStatus === "harvested") && !rightStart && !rightEnd) return false;
  if (leftEnd && rightStart && leftEnd <= rightStart) return false;
  if (rightEnd && leftStart && rightEnd <= leftStart) return false;

  return true;
}

function getRequestedPlacementMode(request: CropRequest): PlacementMode {
  return request.placementMode && request.placementMode !== "auto" ? request.placementMode : "standalone";
}

function allowsAutomaticInterplanting(request: CropRequest) {
  return !request.placementMode || request.placementMode === "auto" || request.placementMode === "interplant";
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

export function normalizePeopleCount(peopleCount: number) {
  return Math.max(1, Math.min(12, Math.round(Number.isFinite(peopleCount) ? peopleCount : 1)));
}

export function getStarterPlantsForIntent(crop: Crop, intent: CropRequest["intent"], peopleCount = 1) {
  const defaultPlants = getDefaultPlantsPerBlock(crop);
  const people = normalizePeopleCount(peopleCount);
  if (intent === "some") return Math.max(1, Math.ceil(defaultPlants / 2)) * people;
  if (intent === "lots") return defaultPlants * 2 * people;
  return defaultPlants * people;
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

export function getPlantPositions(placement: Placement, bed: Bed) {
  const footprint = getCropFootprint(cropById[placement.cropId], bed);

  return Array.from({ length: placement.plantCount }, (_, index) => {
    const column = index % placement.columns;
    const row = Math.floor(index / placement.columns);

    return {
      x: placement.x + footprint.width * column + footprint.width / 2,
      y: placement.y + footprint.height * row + footprint.height / 2,
    };
  });
}

export function canInterplant(childCropId: CropId, hostCropId: CropId) {
  return childCropId === "basil" && tomatoCropIds.includes(hostCropId);
}

function isDeclaredInterplantPair(left: Placement, right: Placement) {
  const leftMode = getPlacementMode(left);
  const rightMode = getPlacementMode(right);

  return (
    (leftMode === "interplant" &&
      left.hostPlacementId === right.id &&
      canInterplant(left.cropId, right.cropId)) ||
    (rightMode === "interplant" &&
      right.hostPlacementId === left.id &&
      canInterplant(right.cropId, left.cropId))
  );
}

function minimumPlantDistanceMeters(left: Placement, right: Placement, bed: Bed) {
  const leftPositions = getPlantPositions(left, bed);
  const rightPositions = getPlantPositions(right, bed);
  let minimumDistance = Number.POSITIVE_INFINITY;

  for (const leftPosition of leftPositions) {
    for (const rightPosition of rightPositions) {
      const dxMeters = centimetersToSvgWidth(bed, 100);
      const dyMeters = centimetersToSvgHeight(bed, 100);
      const deltaX = (leftPosition.x - rightPosition.x) / dxMeters;
      const deltaY = (leftPosition.y - rightPosition.y) / dyMeters;
      minimumDistance = Math.min(minimumDistance, Math.hypot(deltaX, deltaY));
    }
  }

  return minimumDistance;
}

function scorePlacementCandidate(
  candidate: Placement,
  placed: Placement[],
  accessZones: AccessZone[],
  bed: Bed,
) {
  const crop = cropById[candidate.cropId];
  let score = bed.sun === crop.sun ? 12 : -18;

  for (const zone of accessZones) {
    if (placementOverlapsZone(candidate, zone)) score -= zone.kind === "path" ? 80 : 140;
  }

  for (const placement of placed) {
    if (placement.bedId !== bed.id) continue;
    if (!placementsOverlapInTime(candidate, placement)) continue;

    if (rectsOverlap(candidate, placement) && !isDeclaredInterplantPair(candidate, placement)) {
      score -= 160;
    }

    if (
      crop.avoid.includes(placement.cropId) ||
      cropById[placement.cropId].avoid.includes(candidate.cropId)
    ) {
      score -= 90;
    }

    if (
      crop.companions.includes(placement.cropId) ||
      cropById[placement.cropId].companions.includes(candidate.cropId)
    ) {
      score += 18;
    }
  }

  return score;
}

function placeBlockOnBestGridPosition(
  placement: Placement,
  placed: Placement[],
  gardenBeds: Bed[],
  accessZones: AccessZone[] = [],
) {
  const crop = cropById[placement.cropId];
  let bestPlacement: Placement | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const bed of gardenBeds) {
    const layout = getBlockLayout(crop, bed, placement.plantCount);
    if (layout.width > bed.width || layout.height > bed.height) continue;

    const grid = getBedGridSize(bed);
    const maxColumn = Math.max(0, Math.floor((bed.width - layout.width) / grid.width));
    const maxRow = Math.max(0, Math.floor((bed.height - layout.height) / grid.height));

    for (let row = 0; row <= maxRow; row += 1) {
      for (let column = 0; column <= maxColumn; column += 1) {
        const candidate: Placement = {
          ...placement,
          bedId: bed.id,
          columns: layout.columns,
          rows: layout.rows,
          width: layout.width,
          height: layout.height,
          x: bed.x + column * grid.width,
          y: bed.y + row * grid.height,
        };
        const score = scorePlacementCandidate(candidate, placed, accessZones, bed);

        if (score > bestScore) {
          bestScore = score;
          bestPlacement = candidate;
        }
      }
    }
  }

  return bestPlacement ?? placement;
}

function createInterplantPlacement(
  request: CropRequest,
  existing: Placement[],
  idSeed: number,
  gardenBeds: Bed[],
  accessZones: AccessZone[],
  plantCount: number,
) {
  const crop = cropById[request.cropId];
  const sameCropCount = existing.filter((placement) => placement.cropId === request.cropId).length;
  let bestPlacement: Placement | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const host of existing) {
    if (!canInterplant(request.cropId, host.cropId)) continue;
    const bed = gardenBeds.find((candidate) => candidate.id === host.bedId);
    if (!bed) continue;

    const layout = getBlockLayout(crop, bed, plantCount);
    if (layout.width > host.width || layout.height > host.height) continue;

    const grid = getBedGridSize(bed);
    const maxColumn = Math.max(0, Math.floor((host.width - layout.width) / grid.width));
    const maxRow = Math.max(0, Math.floor((host.height - layout.height) / grid.height));

    for (let row = 0; row <= maxRow; row += 1) {
      for (let column = 0; column <= maxColumn; column += 1) {
        const candidate: Placement = {
          id: `${request.cropId}-${idSeed}-${sameCropCount}`,
          cropId: request.cropId,
          bedId: bed.id,
          mode: "interplant",
          hostPlacementId: host.id,
          status: "planned",
          plantCount,
          columns: layout.columns,
          rows: layout.rows,
          x: host.x + column * grid.width,
          y: host.y + row * grid.height,
          width: layout.width,
          height: layout.height,
          locked: false,
          reason: `${crop.name} was automatically interplanted with ${cropById[host.cropId].name}.`,
        };
        const clearance = minimumPlantDistanceMeters(candidate, host, bed);
        const score =
          scorePlacementCandidate(candidate, existing, accessZones, bed) + 70 + Math.min(40, clearance * 100);

        if (score > bestScore) {
          bestScore = score;
          bestPlacement = candidate;
        }
      }
    }
  }

  return bestPlacement;
}

function splitPlantCounts(totalPlants: number, plantsPerBlock: number) {
  const blockSize = Math.max(1, plantsPerBlock);
  const counts: number[] = [];
  let remaining = totalPlants;

  while (remaining > 0) {
    const count = Math.min(blockSize, remaining);
    counts.push(count);
    remaining -= count;
  }

  return counts;
}

function comparePlacementPlans(
  left: Placement[],
  right: Placement[],
  gardenBeds: Bed[],
  accessZones: AccessZone[],
) {
  const leftAnalysis = analyzePlacements(left, gardenBeds, accessZones);
  const rightAnalysis = analyzePlacements(right, gardenBeds, accessZones);
  const leftErrors = leftAnalysis.findings.filter((finding) => finding.level === "error").length;
  const rightErrors = rightAnalysis.findings.filter((finding) => finding.level === "error").length;
  const leftWarnings = leftAnalysis.findings.filter((finding) => finding.level === "warning").length;
  const rightWarnings = rightAnalysis.findings.filter((finding) => finding.level === "warning").length;

  if (leftErrors !== rightErrors) return leftErrors < rightErrors ? left : right;
  if (leftWarnings !== rightWarnings) return leftWarnings < rightWarnings ? left : right;
  if (leftAnalysis.score !== rightAnalysis.score)
    return leftAnalysis.score > rightAnalysis.score ? left : right;

  const leftInterplants = left.filter((placement) => getPlacementMode(placement) === "interplant").length;
  const rightInterplants = right.filter((placement) => getPlacementMode(placement) === "interplant").length;
  if (leftInterplants !== rightInterplants) return leftInterplants > rightInterplants ? left : right;

  return left.length <= right.length ? left : right;
}

function buildPlacementPlanForCounts(
  request: CropRequest,
  basePlacements: Placement[],
  plantCounts: number[],
  idSeed: number,
  gardenBeds: Bed[],
  accessZones: AccessZone[],
) {
  const planned = [...basePlacements];

  for (const plantCount of plantCounts) {
    const placement = createAdditionalPlacement(
      request,
      planned,
      idSeed,
      gardenBeds,
      plantCount,
      accessZones,
    );
    if (placement) planned.push(placement);
  }

  return planned;
}

function buildInterplantPlanForCounts(
  request: CropRequest,
  basePlacements: Placement[],
  plantCounts: number[],
  idSeed: number,
  gardenBeds: Bed[],
  accessZones: AccessZone[],
) {
  const planned = [...basePlacements];

  for (const plantCount of plantCounts) {
    const placement = createInterplantPlacement(
      request,
      planned,
      idSeed,
      gardenBeds,
      accessZones,
      plantCount,
    );
    if (!placement) return undefined;
    planned.push(placement);
  }

  return planned;
}

export function getCompanionSummary(placement: Placement, placements: Placement[]) {
  const crop = cropById[placement.cropId];
  const neighbors = placements.filter(
    (other) =>
      other.id !== placement.id &&
      other.bedId === placement.bedId &&
      placementsOverlapInTime(placement, other),
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

    const overlappingZones = accessZones.filter((zone) => placementOverlapsZone(placement, zone));
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
      (other) =>
        other.id !== placement.id &&
        other.bedId === placement.bedId &&
        placementsOverlapInTime(placement, other),
    );
    const overlappingCrops = neighbors.filter(
      (neighbor) => rectsOverlap(placement, neighbor) && !isDeclaredInterplantPair(placement, neighbor),
    );
    const interplantingCrops = neighbors.filter(
      (neighbor) => rectsOverlap(placement, neighbor) && isDeclaredInterplantPair(placement, neighbor),
    );
    const goodCompanions = neighbors.filter((neighbor) => crop.companions.includes(neighbor.cropId));
    const badCompanions = neighbors.filter((neighbor) => crop.avoid.includes(neighbor.cropId));

    if (getPlacementMode(placement) === "interplant") {
      const host = placements.find((candidate) => candidate.id === placement.hostPlacementId);

      if (!host) {
        findings.push({ level: "error", message: "Interplant placement needs a host crop block." });
        score -= 35;
      } else if (host.bedId !== placement.bedId) {
        findings.push({ level: "error", message: "Interplant host must be in the same bed." });
        score -= 35;
      } else if (!canInterplant(placement.cropId, host.cropId)) {
        findings.push({
          level: "error",
          message: `${crop.name} is not configured as an interplant for ${cropById[host.cropId].name}.`,
        });
        score -= 35;
      } else if (!placementsOverlapInTime(placement, host)) {
        findings.push({
          level: "warning",
          message: `Interplant ${crop.name} should share an active period with ${cropById[host.cropId].name}.`,
        });
        score -= 18;
      } else if (!rectsOverlap(placement, host)) {
        findings.push({
          level: "warning",
          message: `Interplant ${crop.name} should overlap its host ${cropById[host.cropId].name}.`,
        });
        score -= 12;
      } else if (bed) {
        const clearanceMeters = minimumPlantDistanceMeters(placement, host, bed);

        if (clearanceMeters < 0.2) {
          findings.push({
            level: "warning",
            message: `${crop.name} interplant is too close to ${cropById[host.cropId].name}; keep at least 20 cm plant clearance.`,
          });
          score -= 16;
        } else {
          findings.push({
            level: "good",
            message: `${crop.name} is interplanted with ${cropById[host.cropId].name} with ${Math.round(
              clearanceMeters * 100,
            )} cm plant clearance.`,
          });
          score += 6;
        }
      }
    }

    if (overlappingCrops.length > 0) {
      findings.push({
        level: "error",
        message: `Overlaps crop block ${overlappingCrops
          .map((neighbor) => cropById[neighbor.cropId].name)
          .join(", ")}.`,
      });
      score -= 32;
    }

    if (interplantingCrops.length > 0 && getPlacementMode(placement) !== "interplant") {
      findings.push({
        level: "good",
        message: `Hosts interplant ${interplantingCrops
          .map((neighbor) => cropById[neighbor.cropId].name)
          .join(", ")}.`,
      });
      score += 4;
    }

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

export function createAdditionalPlacement(
  request: CropRequest,
  existing: Placement[],
  idSeed = Date.now(),
  gardenBeds = beds,
  plantCountOverride?: number,
  accessZones: AccessZone[] = [],
  peopleCount = 1,
) {
  if (gardenBeds.length === 0) return undefined;

  const { cropId } = request;
  const crop = cropById[cropId];
  const preferredBed =
    gardenBeds.find(
      (bed) =>
        bed.sun === crop.sun &&
        !existing.some((placement) => crop.avoid.includes(placement.cropId) && placement.bedId === bed.id),
    ) ??
    gardenBeds.find(
      (bed) =>
        !existing.some((placement) => crop.avoid.includes(placement.cropId) && placement.bedId === bed.id),
    ) ??
    gardenBeds[0];

  const plantCount = plantCountOverride ?? getStarterPlantsForIntent(crop, request.intent, peopleCount);
  const layout = getBlockLayout(crop, preferredBed, plantCount);
  const width = layout.width;
  const height = layout.height;
  const gap = 8;
  const offset = existing.filter((placement) => placement.bedId === preferredBed.id).length;
  const sameCropCount = existing.filter((placement) => placement.cropId === cropId).length;
  const columns = Math.max(1, Math.floor((preferredBed.width - 28 + gap) / (width + gap)));
  const column = offset % columns;
  const row = Math.floor(offset / columns);

  const placement = {
    id: `${cropId}-${idSeed}-${sameCropCount}`,
    cropId,
    bedId: preferredBed.id,
    plantCount,
    columns: layout.columns,
    rows: layout.rows,
    x: preferredBed.x + 14 + column * (width + gap),
    y: preferredBed.y + 14 + row * (height + gap),
    width,
    height,
    mode: getRequestedPlacementMode(request),
    status: "planned",
    locked: false,
    reason: `${preferredBed.name} matches ${crop.sun} sun and starts a ${request.intent} ${crop.name.toLowerCase()} area with ${plantCount} plant${plantCount === 1 ? "" : "s"} at ${crop.spacingCm.inRow} x ${crop.spacingCm.betweenRows} cm spacing.`,
  } satisfies Placement;

  return placeBlockOnBestGridPosition(placement, existing, gardenBeds, accessZones);
}

export function createSuggestions(
  requests: CropRequest[],
  existing: Placement[],
  idSeed = Date.now(),
  gardenBeds = beds,
  peopleCount = 1,
) {
  const requestedCropIds = new Set(requests.map((request) => request.cropId));
  const preserved = existing.filter(
    (placement) =>
      placement.locked || isHistoricalPlacement(placement) || requestedCropIds.has(placement.cropId),
  );
  const suggestions: Placement[] = [...preserved];

  if (gardenBeds.length === 0) return suggestions;

  for (const request of requests) {
    const { cropId } = request;
    if (suggestions.some((placement) => placement.cropId === cropId)) continue;

    const suggestion = createAdditionalPlacement(
      request,
      suggestions,
      idSeed,
      gardenBeds,
      undefined,
      [],
      peopleCount,
    );
    if (suggestion) suggestions.push(suggestion);
  }

  return suggestions;
}

export function optimizePlacementsForRequests(
  requests: CropRequest[],
  existing: Placement[],
  idSeed = Date.now(),
  gardenBeds = beds,
  accessZones: AccessZone[] = [],
  peopleCount = 1,
) {
  if (gardenBeds.length === 0) return existing;

  const requestedCropIds = new Set(requests.map((request) => request.cropId));
  let optimized: Placement[] = existing.filter(
    (placement) =>
      placement.locked || isHistoricalPlacement(placement) || requestedCropIds.has(placement.cropId),
  );

  for (const request of requests) {
    const crop = cropById[request.cropId];
    const targetPlants = getStarterPlantsForIntent(crop, request.intent, peopleCount);
    const lockedPlants = optimized
      .filter((placement) => placement.cropId === request.cropId && placement.locked)
      .reduce((total, placement) => total + placement.plantCount, 0);
    const remainingPlants = Math.max(0, targetPlants - lockedPlants);

    const basePlacements = optimized.filter(
      (placement) =>
        placement.cropId !== request.cropId || placement.locked || isHistoricalPlacement(placement),
    );

    if (remainingPlants === 0) {
      optimized = basePlacements;
      continue;
    }

    const singleBlockPlan = buildPlacementPlanForCounts(
      request,
      basePlacements,
      [remainingPlants],
      idSeed,
      gardenBeds,
      accessZones,
    );
    const splitBlockSize = getStarterPlantsForIntent(crop, request.intent, 1);
    const splitCounts = splitPlantCounts(remainingPlants, splitBlockSize);
    const splitBlockPlan =
      splitCounts.length > 1
        ? buildPlacementPlanForCounts(request, basePlacements, splitCounts, idSeed, gardenBeds, accessZones)
        : singleBlockPlan;
    const interplantCounts = splitPlantCounts(remainingPlants, getDefaultPlantsPerBlock(crop));
    const interplantPlan = allowsAutomaticInterplanting(request)
      ? buildInterplantPlanForCounts(
          request,
          basePlacements,
          interplantCounts,
          idSeed,
          gardenBeds,
          accessZones,
        )
      : undefined;

    optimized = [singleBlockPlan, splitBlockPlan, interplantPlan]
      .filter((plan): plan is Placement[] => Boolean(plan))
      .reduce((best, plan) => comparePlacementPlans(best, plan, gardenBeds, accessZones));
  }

  return optimized;
}
