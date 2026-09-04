import { describe, expect, it } from "vitest";
import {
  calculateGardenValueScore,
  cropById,
  crops,
  describeGardenValue,
  describeYieldEstimate,
  filterCrops,
  getCropCategories,
  suggestAdditionalCrops,
  type CropRequest,
} from "./cropCatalog";
import {
  analyzePlacements,
  canInterplant,
  createAdditionalPlacement,
  createReplacementPlacement,
  createSuggestions,
  getBlockLayoutFromSize,
  getBlockLayout,
  getCompanionSummary,
  getCropFootprint,
  getDefaultPlantsPerBlock,
  getPlantPositions,
  getStarterPlantsForIntent,
  normalizePeopleCount,
  optimizePlacementsForRequests,
  placementsOverlapInTime,
  type Placement,
} from "./planner";
import { beds, centimetersToSvgHeight, centimetersToSvgWidth } from "./garden";

function request(cropId: CropRequest["cropId"], intent: CropRequest["intent"] = "normal"): CropRequest {
  return { cropId, priority: "must", intent };
}

const defaultCropFilters = {
  search: "",
  category: "all",
  sun: "all" as const,
  water: "all" as const,
  suitability: "all" as const,
  season: "all" as const,
  highValueOnly: false,
};

describe("planner", () => {
  it("creates one starter placement block for each selected crop", () => {
    const suggestions = createSuggestions([request("tomato"), request("basil")], [], 123);

    expect(suggestions).toHaveLength(2);
    expect(suggestions.filter((placement) => placement.cropId === "tomato")).toHaveLength(1);
    expect(suggestions.filter((placement) => placement.cropId === "basil")).toHaveLength(1);
    expect(suggestions.filter((placement) => placement.cropId === "tomato")[0].plantCount).toBe(1);
    expect(suggestions.filter((placement) => placement.cropId === "basil")[0].plantCount).toBe(4);
    expect(suggestions.every((placement) => placement.locked === false)).toBe(true);
  });

  it("uses crop intent to size starter planting blocks", () => {
    const suggestions = createSuggestions([request("carrot", "lots")], [], 234);
    const carrotBlocks = suggestions.filter((placement) => placement.cropId === "carrot");

    expect(getDefaultPlantsPerBlock(cropById.carrot)).toBe(12);
    expect(getStarterPlantsForIntent(cropById.carrot, "some")).toBe(6);
    expect(getStarterPlantsForIntent(cropById.carrot, "lots")).toBe(24);
    expect(carrotBlocks).toHaveLength(1);
    expect(carrotBlocks[0].plantCount).toBe(24);
  });

  it("scales crop intent targets by household size", () => {
    expect(normalizePeopleCount(0)).toBe(1);
    expect(normalizePeopleCount(20)).toBe(12);
    expect(getStarterPlantsForIntent(cropById.tomato, "normal", 4)).toBe(4);
    expect(getStarterPlantsForIntent(cropById.carrot, "some", 3)).toBe(18);
  });

  it("uses the crop request placement mode for new suggestions", () => {
    const suggestions = createSuggestions(
      [{ cropId: "basil", priority: "must", intent: "normal", placementMode: "interplant" }],
      [],
      345,
    );

    expect(suggestions[0].cropId).toBe("basil");
    expect(suggestions[0].mode).toBe("interplant");
  });

  it("uses household size when creating new placement suggestions", () => {
    const suggestions = createSuggestions([request("tomato")], [], 654, beds, 4);

    expect(suggestions[0].cropId).toBe("tomato");
    expect(suggestions[0].plantCount).toBe(4);
  });

  it("can create additional placement blocks for the same crop request", () => {
    const first = createAdditionalPlacement(request("carrot", "some"), [], 456)!;
    const second = createAdditionalPlacement(request("carrot", "some"), [first], 456)!;

    expect(first.cropId).toBe("carrot");
    expect(second.cropId).toBe("carrot");
    expect(first.id).not.toBe(second.id);
    expect(first.plantCount).toBe(second.plantCount);
  });

  it("optimizes unlocked blocks to the current crop intent target", () => {
    const first = createAdditionalPlacement(request("carrot", "some"), [], 456)!;
    const second = createAdditionalPlacement(request("carrot", "some"), [first], 456)!;
    const optimized = optimizePlacementsForRequests([request("carrot", "lots")], [first, second], 789);
    const carrotBlocks = optimized.filter((placement) => placement.cropId === "carrot");

    expect(carrotBlocks).toHaveLength(1);
    expect(carrotBlocks[0].plantCount).toBe(getStarterPlantsForIntent(cropById.carrot, "lots"));
  });

  it("optimizes unlocked blocks to household-scaled targets", () => {
    const optimized = optimizePlacementsForRequests([request("tomato")], [], 159, beds, [], 3);
    const tomato = optimized.find((placement) => placement.cropId === "tomato")!;

    expect(tomato.plantCount).toBe(3);
  });

  it("does not resize or delete locked blocks while optimizing requests", () => {
    const lockedTomato: Placement = {
      id: "locked-tomato",
      cropId: "tomato",
      bedId: "right-upper",
      plantCount: 1,
      columns: 1,
      rows: 1,
      x: 400,
      y: 140,
      width: 90,
      height: 62,
      locked: true,
      reason: "User locked this placement.",
    };
    const optimized = optimizePlacementsForRequests([request("tomato", "lots")], [lockedTomato], 789);

    expect(optimized.find((placement) => placement.id === lockedTomato.id)).toEqual(lockedTomato);
    expect(optimized.filter((placement) => placement.cropId === "tomato")).toHaveLength(2);
  });

  it("places optimized blocks to avoid ordinary crop overlap when space is available", () => {
    const optimized = optimizePlacementsForRequests([request("tomato"), request("basil")], [], 246, beds, []);
    const analysis = analyzePlacements(optimized, beds, []);

    expect(optimized).toHaveLength(2);
    expect(analysis.findings.some((finding) => finding.message.includes("Overlaps crop block"))).toBe(false);
  });

  it("can automatically choose basil interplanting inside tomato blocks", () => {
    const optimized = optimizePlacementsForRequests(
      [
        { ...request("tomato", "lots"), placementMode: "auto" },
        { ...request("basil", "some"), placementMode: "auto" },
      ],
      [],
      468,
      beds,
      [],
    );
    const basil = optimized.find((placement) => placement.cropId === "basil")!;
    const tomato = optimized.find((placement) => placement.id === basil.hostPlacementId);
    const analysis = analyzePlacements(optimized, beds, []);

    expect(basil.mode).toBe("interplant");
    expect(tomato?.cropId).toBe("tomato");
    expect(analysis.findings.some((finding) => finding.message.includes("Overlaps crop block"))).toBe(false);
    expect(analysis.findings.some((finding) => finding.message.includes("interplanted with"))).toBe(true);
  });

  it("can automatically interplant even when the companion crop is requested before its host", () => {
    const optimized = optimizePlacementsForRequests(
      [
        { ...request("basil", "some"), placementMode: "auto" },
        { ...request("tomato", "lots"), placementMode: "auto" },
      ],
      [],
      469,
      beds,
      [],
    );
    const basil = optimized.find((placement) => placement.cropId === "basil")!;
    const tomato = optimized.find((placement) => placement.id === basil.hostPlacementId);
    const analysis = analyzePlacements(optimized, beds, []);

    expect(basil.mode).toBe("interplant");
    expect(tomato?.cropId).toBe("tomato");
    expect(analysis.findings.some((finding) => finding.message.includes("Overlaps crop block"))).toBe(false);
  });

  it("automatically interplants what fits and places overflow as standalone blocks", () => {
    const optimized = optimizePlacementsForRequests(
      [
        { ...request("tomato"), placementMode: "auto" },
        { ...request("basil", "lots"), placementMode: "auto" },
      ],
      [],
      470,
      beds,
      [],
    );
    const basilBlocks = optimized.filter((placement) => placement.cropId === "basil");
    const interplantedBasilPlants = basilBlocks
      .filter((placement) => placement.mode === "interplant")
      .reduce((total, placement) => total + placement.plantCount, 0);
    const standaloneBasilPlants = basilBlocks
      .filter((placement) => placement.mode !== "interplant")
      .reduce((total, placement) => total + placement.plantCount, 0);
    const analysis = analyzePlacements(optimized, beds, []);

    expect(interplantedBasilPlants).toBeGreaterThan(0);
    expect(standaloneBasilPlants).toBeGreaterThan(0);
    expect(interplantedBasilPlants + standaloneBasilPlants).toBe(
      getStarterPlantsForIntent(cropById.basil, "lots"),
    );
    expect(analysis.findings.some((finding) => finding.message.includes("Overlaps crop block"))).toBe(false);
  });

  it("does not automatically interplant when standalone is forced", () => {
    const optimized = optimizePlacementsForRequests(
      [
        { ...request("tomato", "lots"), placementMode: "auto" },
        { ...request("basil", "some"), placementMode: "standalone" },
      ],
      [],
      579,
      beds,
      [],
    );
    const basil = optimized.find((placement) => placement.cropId === "basil")!;

    expect(basil.mode).toBe("standalone");
    expect(basil.hostPlacementId).toBeUndefined();
  });

  it("places bad companions in another bed when one is available", () => {
    const rightUpper = beds.find((bed) => bed.id === "right-upper")!;
    const tomatoFootprint = getCropFootprint(cropById.tomato, rightUpper);
    const lockedTomato: Placement = {
      id: "locked-tomato",
      cropId: "tomato",
      bedId: rightUpper.id,
      plantCount: 1,
      columns: 1,
      rows: 1,
      x: rightUpper.x,
      y: rightUpper.y,
      width: tomatoFootprint.width,
      height: tomatoFootprint.height,
      locked: true,
      reason: "User locked this placement.",
    };

    const optimized = optimizePlacementsForRequests(
      [request("tomato"), request("cabbage")],
      [lockedTomato],
      135,
      beds,
      [],
    );
    const cabbage = optimized.find((placement) => placement.cropId === "cabbage")!;
    const analysis = analyzePlacements(optimized, beds, []);

    expect(cabbage.bedId).not.toBe(lockedTomato.bedId);
    expect(analysis.findings.some((finding) => finding.message.includes("Avoid near"))).toBe(false);
  });

  it("places optimized blocks away from path and access zones when space is available", () => {
    const rightUpper = beds.find((bed) => bed.id === "right-upper")!;
    const accessZones = [
      {
        id: "covered-bed-path",
        name: "Covered bed path",
        kind: "path" as const,
        x: rightUpper.x,
        y: rightUpper.y,
        width: rightUpper.width,
        height: rightUpper.height,
      },
    ];

    const optimized = optimizePlacementsForRequests([request("tomato")], [], 864, beds, accessZones);
    const analysis = analyzePlacements(optimized, beds, accessZones);

    expect(optimized[0].bedId).not.toBe(rightUpper.id);
    expect(analysis.findings.some((finding) => finding.message.includes("soft crop path"))).toBe(false);
  });

  it("allows tiny soft path edge contact without reporting a path overlap", () => {
    const rightUpper = beds.find((bed) => bed.id === "right-upper")!;
    const tomatoFootprint = getCropFootprint(cropById.tomato, rightUpper);
    const tomato: Placement = {
      id: "tomato",
      cropId: "tomato",
      bedId: rightUpper.id,
      plantCount: 1,
      columns: 1,
      rows: 1,
      x: rightUpper.x,
      y: rightUpper.y,
      width: tomatoFootprint.width,
      height: tomatoFootprint.height,
      locked: false,
      reason: "Test.",
    };
    const edgePath = {
      id: "edge-path",
      name: "Edge path",
      kind: "path" as const,
      x: rightUpper.x,
      y: rightUpper.y - centimetersToSvgHeight(rightUpper, 8),
      width: rightUpper.width,
      height: centimetersToSvgHeight(rightUpper, 10),
    };

    const analysis = analyzePlacements([tomato], beds, [edgePath]);

    expect(analysis.findings.some((finding) => finding.message.includes("soft crop path"))).toBe(false);
  });

  it("splits large crop targets into multiple smaller blocks when one block cannot fit", () => {
    const optimized = optimizePlacementsForRequests([request("winterSquash", "lots")], [], 753, beds, [], 2);
    const squashBlocks = optimized.filter((placement) => placement.cropId === "winterSquash");
    const analysis = analyzePlacements(optimized, beds, []);

    expect(squashBlocks).toHaveLength(2);
    expect(squashBlocks.reduce((total, placement) => total + placement.plantCount, 0)).toBe(4);
    expect(analysis.findings.some((finding) => finding.message.includes("extends outside"))).toBe(false);
  });

  it("updates plant count from a resized block size", () => {
    const rightUpper = beds.find((bed) => bed.id === "right-upper")!;
    const carrotFootprint = getCropFootprint(cropById.carrot, rightUpper);
    const layout = getBlockLayoutFromSize(
      cropById.carrot,
      rightUpper,
      carrotFootprint.width * 5.2,
      carrotFootprint.height * 2.6,
    );

    expect(layout.columns).toBe(5);
    expect(layout.rows).toBe(3);
    expect(layout.plantCount).toBe(15);
    expect(layout.width).toBeCloseTo(carrotFootprint.width * 5);
    expect(layout.height).toBeCloseTo(carrotFootprint.height * 3);
  });

  it("sizes crop placements from spacing requirements", () => {
    const rightUpper = beds.find((bed) => bed.id === "right-upper")!;
    const tomatoFootprint = getCropFootprint(cropById.tomato, rightUpper);
    const carrotFootprint = getCropFootprint(cropById.carrot, rightUpper);
    const suggestions = createSuggestions([request("tomato"), request("carrot", "some")], [], 789);
    const tomato = suggestions.find((placement) => placement.cropId === "tomato")!;
    const carrot = suggestions.find((placement) => placement.cropId === "carrot")!;

    expect(tomatoFootprint.width).toBeCloseTo(centimetersToSvgWidth(rightUpper, 60));
    expect(tomatoFootprint.height).toBeCloseTo(centimetersToSvgHeight(rightUpper, 60));
    expect(getBlockLayout(cropById.carrot, rightUpper, 12).width).toBeCloseTo(carrotFootprint.width * 4);
    expect(getBlockLayout(cropById.carrot, rightUpper, 12).height).toBeCloseTo(carrotFootprint.height * 3);
    expect(tomato.width).toBeCloseTo(tomatoFootprint.width);
    expect(tomato.height).toBeCloseTo(tomatoFootprint.height);
    expect(carrot.width).toBeCloseTo(carrotFootprint.width * 3);
    expect(carrot.height).toBeCloseTo(carrotFootprint.height * 2);
    expect(carrot.plantCount).toBe(6);
    expect(carrot.width / carrot.plantCount).toBeLessThan(tomato.width / tomato.plantCount);
  });

  it("keeps locked placements and does not add another starter block for the same crop", () => {
    const lockedTomato: Placement = {
      id: "locked-tomato",
      cropId: "tomato",
      bedId: "right-upper",
      plantCount: 1,
      columns: 1,
      rows: 1,
      x: 400,
      y: 140,
      width: 90,
      height: 62,
      locked: true,
      reason: "User locked this placement.",
    };

    const suggestions = createSuggestions([request("tomato")], [lockedTomato], 456);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toEqual(lockedTomato);
    expect(suggestions.filter((placement) => placement.cropId === "tomato")).toHaveLength(1);
  });

  it("keeps resized unlocked placements when suggestions are refreshed", () => {
    const resizedCarrot: Placement = {
      id: "resized-carrot",
      cropId: "carrot",
      bedId: "right-upper",
      plantCount: 15,
      columns: 5,
      rows: 3,
      x: 420,
      y: 150,
      width: 120,
      height: 90,
      locked: false,
      reason: "User resized this block.",
    };

    const suggestions = createSuggestions([request("carrot"), request("basil")], [resizedCarrot], 456);

    expect(suggestions.find((placement) => placement.id === "resized-carrot")).toEqual(resizedCarrot);
    expect(suggestions.filter((placement) => placement.cropId === "carrot")).toHaveLength(1);
    expect(suggestions.find((placement) => placement.cropId === "basil")).toBeDefined();
  });

  it("reports good companions and avoid warnings inside the same bed", () => {
    const tomato: Placement = {
      id: "tomato",
      cropId: "tomato",
      bedId: "right-upper",
      plantCount: 1,
      columns: 1,
      rows: 1,
      x: 400,
      y: 140,
      width: 90,
      height: 62,
      locked: false,
      reason: "Test placement.",
    };
    const basil: Placement = {
      ...tomato,
      id: "basil",
      cropId: "basil",
      x: 500,
    };
    const cabbage: Placement = {
      ...tomato,
      id: "cabbage",
      cropId: "cabbage",
      x: 600,
    };

    expect(getCompanionSummary(tomato, [tomato, basil])).toBe("Good companion: Basil");
    expect(getCompanionSummary(tomato, [tomato, basil, cabbage])).toBe("Avoid near Cabbage");
  });

  it("uses the provided garden beds when creating suggestions", () => {
    const customBeds = beds.map((bed) =>
      bed.id === "right-upper" ? { ...bed, name: "Sunny renamed bed", sun: "partial" as const } : bed,
    );
    const suggestions = createSuggestions([request("lettuce")], [], 987, customBeds);

    expect(suggestions[0].bedId).toBe("right-upper");
    expect(suggestions[0].reason).toContain("Sunny renamed bed");
  });

  it("scores high-value crops above low practical-value crops", () => {
    expect(calculateGardenValueScore(cropById.tomato)).toBeGreaterThan(
      calculateGardenValueScore(cropById.potato),
    );
    expect(describeGardenValue(calculateGardenValueScore(cropById.tomato))).toBe("Excellent garden value");
  });

  it("defines required catalog fields for every crop", () => {
    expect(crops.length).toBeGreaterThanOrEqual(29);

    for (const crop of crops) {
      expect(crop.name).toBeTruthy();
      expect(crop.latinName).toBeTruthy();
      expect(crop.spacingCm.inRow).toBeGreaterThan(0);
      expect(crop.spacingCm.betweenRows).toBeGreaterThan(0);
      expect(crop.spacingSource).toBeTruthy();
      expect(crop.yieldEstimate.source).toBeTruthy();
      expect(crop.gardenValue.rarity).toBeGreaterThanOrEqual(1);
      expect(crop.gardenValue.rarity).toBeLessThanOrEqual(5);
      expect(calculateGardenValueScore(crop)).toBeGreaterThan(0);
    }
  });

  it("includes representative Zollinger-like crop categories", () => {
    expect(cropById.arugula.category).toBe("Leaf");
    expect(cropById.pakChoi.category).toBe("Asian green");
    expect(cropById.kohlrabi.family).toBe("Brassica");
    expect(cropById.leek.family).toBe("Allium");
    expect(cropById.eggplant.family).toBe("Nightshade");
    expect(cropById.winterSquash.family).toBe("Cucurbit");
  });

  it("offers practical tomato size variants", () => {
    expect(cropById.tomatoCherry.name).toBe("Tomato, cherry");
    expect(cropById.tomato.name).toBe("Tomato, medium");
    expect(cropById.tomatoBeefsteak.name).toBe("Tomato, large meaty");
    expect(cropById.tomatoBeefsteak.spacingCm.inRow).toBeGreaterThan(cropById.tomatoCherry.spacingCm.inRow);
    expect(cropById.basil.companions).toEqual(
      expect.arrayContaining(["tomatoCherry", "tomato", "tomatoBeefsteak"]),
    );
  });

  it("filters the crop picker catalog by selected crops, category, season, and value", () => {
    const selectedCropIds = new Set<CropRequest["cropId"]>(["tomato"]);
    const leafCrops = filterCrops(crops, selectedCropIds, {
      ...defaultCropFilters,
      category: "Leaf",
      season: "spring",
      highValueOnly: true,
    });

    expect(getCropCategories()).toContain("Leaf");
    expect(leafCrops.length).toBeGreaterThan(0);
    expect(leafCrops.every((crop) => crop.category === "Leaf")).toBe(true);
    expect(leafCrops.every((crop) => crop.smallGardenSuitability !== "poor")).toBe(true);
    expect(leafCrops.every((crop) => calculateGardenValueScore(crop) >= 70)).toBe(true);
    expect(leafCrops.some((crop) => crop.id === "tomato")).toBe(false);
  });

  it("searches picker crops by tags and source notes", () => {
    const sourceMatches = filterCrops(crops, new Set(), {
      ...defaultCropFilters,
      search: "repeat harvesting",
    });
    const tagMatches = filterCrops(crops, new Set(), {
      ...defaultCropFilters,
      search: "snack",
    });

    expect(sourceMatches.some((crop) => crop.id === "basil")).toBe(true);
    expect(tagMatches.some((crop) => crop.id === "tomatoCherry")).toBe(true);
  });

  it("describes yield estimates without treating per-area crops as plant counts", () => {
    expect(describeYieldEstimate(cropById.tomato, 2)).toContain("/ 2 plants");
    expect(describeYieldEstimate(cropById.carrot, 12)).toContain("/ m2");
  });

  it("suggests additional crops from companions and small-garden value", () => {
    const suggestions = suggestAdditionalCrops([request("tomato")], 3);

    expect(suggestions).toHaveLength(3);
    expect(suggestions.some((suggestion) => suggestion.crop.id === "basil")).toBe(true);
    expect(suggestions.every((suggestion) => suggestion.crop.smallGardenSuitability !== "poor")).toBe(true);
  });

  it("scores placement analysis from sun, companion, and path conflicts", () => {
    const rightUpper = beds.find((bed) => bed.id === "right-upper")!;
    const tomato: Placement = {
      id: "tomato",
      cropId: "tomato",
      bedId: rightUpper.id,
      plantCount: 1,
      columns: 1,
      rows: 1,
      x: rightUpper.x + 10,
      y: rightUpper.y + 10,
      width: 30,
      height: 30,
      locked: false,
      reason: "Test.",
    };
    const cabbage: Placement = {
      ...tomato,
      id: "cabbage",
      cropId: "cabbage",
      x: tomato.x + 40,
    };
    const lettuce: Placement = {
      ...tomato,
      id: "lettuce",
      cropId: "lettuce",
      y: tomato.y + 40,
    };
    const analysis = analyzePlacements([tomato, cabbage, lettuce], beds, [
      { id: "chip-path", name: "Chip path", kind: "path", x: tomato.x, y: tomato.y, width: 20, height: 20 },
    ]);
    const tomatoScore = analysis.placements.find((placement) => placement.placementId === "tomato")!;
    const lettuceScore = analysis.placements.find((placement) => placement.placementId === "lettuce")!;

    expect(analysis.score).toBeLessThan(100);
    expect(tomatoScore.findings.some((finding) => finding.message.includes("Avoid near Cabbage"))).toBe(true);
    expect(tomatoScore.findings.some((finding) => finding.message.includes("soft crop path"))).toBe(true);
    expect(lettuceScore.findings.some((finding) => finding.message.includes("prefers partial sun"))).toBe(
      true,
    );
  });

  it("detects spacing conflicts between overlapping crop blocks", () => {
    const rightUpper = beds.find((bed) => bed.id === "right-upper")!;
    const carrot: Placement = {
      id: "carrot",
      cropId: "carrot",
      bedId: rightUpper.id,
      plantCount: 12,
      columns: 4,
      rows: 3,
      x: rightUpper.x + 20,
      y: rightUpper.y + 20,
      width: 80,
      height: 60,
      locked: false,
      reason: "Test.",
    };
    const lettuce: Placement = {
      ...carrot,
      id: "lettuce",
      cropId: "lettuce",
      x: carrot.x + 30,
      y: carrot.y + 20,
    };

    const analysis = analyzePlacements([carrot, lettuce], beds, []);
    const carrotScore = analysis.placements.find((placement) => placement.placementId === "carrot")!;
    const lettuceScore = analysis.placements.find((placement) => placement.placementId === "lettuce")!;

    expect(carrotScore.score).toBeLessThan(100);
    expect(lettuceScore.score).toBeLessThan(100);
    expect(carrotScore.findings.some((finding) => finding.message.includes("Overlaps crop block"))).toBe(
      true,
    );
    expect(lettuceScore.findings.some((finding) => finding.message.includes("Overlaps crop block"))).toBe(
      true,
    );
  });

  it("allows the same bed space for succession crops with non-overlapping active windows", () => {
    const rightUpper = beds.find((bed) => bed.id === "right-upper")!;
    const carrot: Placement = {
      id: "carrot",
      cropId: "carrot",
      bedId: rightUpper.id,
      status: "harvested",
      plannedStartDate: "2026-03-01",
      harvestDate: "2026-05-01",
      plantCount: 12,
      columns: 4,
      rows: 3,
      x: rightUpper.x + 20,
      y: rightUpper.y + 20,
      width: 80,
      height: 60,
      locked: false,
      reason: "Spring crop.",
    };
    const lettuce: Placement = {
      ...carrot,
      id: "lettuce",
      cropId: "lettuce",
      status: "planned",
      plannedStartDate: "2026-05-02",
      harvestDate: "2026-06-15",
      reason: "Follow-up crop.",
    };

    const analysis = analyzePlacements([carrot, lettuce], beds, []);

    expect(placementsOverlapInTime(carrot, lettuce)).toBe(false);
    expect(analysis.findings.some((finding) => finding.message.includes("Overlaps crop block"))).toBe(false);
  });

  it("keeps overlap errors when succession crop active windows overlap", () => {
    const rightUpper = beds.find((bed) => bed.id === "right-upper")!;
    const carrot: Placement = {
      id: "carrot",
      cropId: "carrot",
      bedId: rightUpper.id,
      status: "planted",
      plantedDate: "2026-03-01",
      harvestDate: "2026-06-01",
      plantCount: 12,
      columns: 4,
      rows: 3,
      x: rightUpper.x + 20,
      y: rightUpper.y + 20,
      width: 80,
      height: 60,
      locked: false,
      reason: "Spring crop.",
    };
    const lettuce: Placement = {
      ...carrot,
      id: "lettuce",
      cropId: "lettuce",
      status: "planned",
      plannedStartDate: "2026-05-15",
      harvestDate: "2026-06-15",
      reason: "Follow-up crop.",
    };

    const analysis = analyzePlacements([carrot, lettuce], beds, []);

    expect(placementsOverlapInTime(carrot, lettuce)).toBe(true);
    expect(analysis.findings.some((finding) => finding.message.includes("Overlaps crop block"))).toBe(true);
  });

  it("ignores completed undated blocks for active crop conflicts", () => {
    const rightUpper = beds.find((bed) => bed.id === "right-upper")!;
    const removedCarrot: Placement = {
      id: "carrot",
      cropId: "carrot",
      bedId: rightUpper.id,
      status: "removed",
      plantCount: 12,
      columns: 4,
      rows: 3,
      x: rightUpper.x + 20,
      y: rightUpper.y + 20,
      width: 80,
      height: 60,
      locked: false,
      reason: "Removed crop.",
    };
    const lettuce: Placement = {
      ...removedCarrot,
      id: "lettuce",
      cropId: "lettuce",
      status: "planned",
      reason: "Replacement crop.",
    };

    const analysis = analyzePlacements([removedCarrot, lettuce], beds, []);

    expect(placementsOverlapInTime(removedCarrot, lettuce)).toBe(false);
    expect(analysis.findings.some((finding) => finding.message.includes("Overlaps crop block"))).toBe(false);
  });

  it("does not report companion conflicts for crops in different active windows", () => {
    const rightUpper = beds.find((bed) => bed.id === "right-upper")!;
    const tomato: Placement = {
      id: "tomato",
      cropId: "tomato",
      bedId: rightUpper.id,
      status: "harvested",
      plannedStartDate: "2026-04-01",
      harvestDate: "2026-07-01",
      plantCount: 1,
      columns: 1,
      rows: 1,
      x: rightUpper.x + 20,
      y: rightUpper.y + 20,
      width: 80,
      height: 60,
      locked: false,
      reason: "Early tomato.",
    };
    const cabbage: Placement = {
      ...tomato,
      id: "cabbage",
      cropId: "cabbage",
      status: "planned",
      plannedStartDate: "2026-07-02",
      harvestDate: "2026-10-01",
      x: tomato.x + 90,
      reason: "Late cabbage.",
    };

    const analysis = analyzePlacements([tomato, cabbage], beds, []);

    expect(getCompanionSummary(tomato, [tomato, cabbage])).toBe("No companion conflict");
    expect(analysis.findings.some((finding) => finding.message.includes("Avoid near"))).toBe(false);
  });

  it("creates a planned replacement block in the same geometry as a harvested block", () => {
    const rightUpper = beds.find((bed) => bed.id === "right-upper")!;
    const harvestedTomato: Placement = {
      id: "tomato",
      cropId: "tomato",
      bedId: rightUpper.id,
      status: "harvested",
      plantedDate: "2026-05-15",
      harvestDate: "2026-08-01",
      plantCount: 1,
      columns: 1,
      rows: 1,
      x: rightUpper.x + 20,
      y: rightUpper.y + 20,
      width: 120,
      height: 80,
      locked: false,
      reason: "Finished tomato.",
    };

    const replacement = createReplacementPlacement(harvestedTomato, "lettuce", 123, beds)!;

    expect(replacement.cropId).toBe("lettuce");
    expect(replacement.status).toBe("planned");
    expect(replacement.plannedStartDate).toBe("2026-08-01");
    expect(replacement.x).toBe(harvestedTomato.x);
    expect(replacement.y).toBe(harvestedTomato.y);
    expect(replacement.width).toBe(harvestedTomato.width);
    expect(replacement.height).toBe(harvestedTomato.height);
    expect(replacement.plantCount).toBeGreaterThan(harvestedTomato.plantCount);
    expect(replacement.reason).toContain("replaces harvested Tomato");
  });

  it("lets a replacement crop reuse harvested space without overlap errors", () => {
    const rightUpper = beds.find((bed) => bed.id === "right-upper")!;
    const harvestedTomato: Placement = {
      id: "tomato",
      cropId: "tomato",
      bedId: rightUpper.id,
      status: "harvested",
      plantedDate: "2026-05-15",
      harvestDate: "2026-08-01",
      plantCount: 1,
      columns: 1,
      rows: 1,
      x: rightUpper.x + 20,
      y: rightUpper.y + 20,
      width: 120,
      height: 80,
      locked: false,
      reason: "Finished tomato.",
    };
    const replacement = createReplacementPlacement(harvestedTomato, "lettuce", 123, beds, "2026-08-01")!;

    const analysis = analyzePlacements([harvestedTomato, replacement], beds, []);

    expect(placementsOverlapInTime(harvestedTomato, replacement)).toBe(false);
    expect(analysis.findings.some((finding) => finding.message.includes("Overlaps crop block"))).toBe(false);
  });

  it("allows declared basil interplanting inside tomato blocks when plant clearance is sufficient", () => {
    const rightUpper = beds.find((bed) => bed.id === "right-upper")!;
    const tomatoFootprint = getCropFootprint(cropById.tomato, rightUpper);
    const basilFootprint = getCropFootprint(cropById.basil, rightUpper);
    const tomato: Placement = {
      id: "tomato",
      cropId: "tomato",
      bedId: rightUpper.id,
      plantCount: 1,
      columns: 1,
      rows: 1,
      x: rightUpper.x + 20,
      y: rightUpper.y + 20,
      width: tomatoFootprint.width,
      height: tomatoFootprint.height,
      locked: false,
      reason: "Test.",
    };
    const basil: Placement = {
      id: "basil",
      cropId: "basil",
      bedId: rightUpper.id,
      mode: "interplant",
      hostPlacementId: tomato.id,
      plantCount: 1,
      columns: 1,
      rows: 1,
      x: tomato.x + tomatoFootprint.width - basilFootprint.width,
      y: tomato.y + tomatoFootprint.height - basilFootprint.height,
      width: basilFootprint.width,
      height: basilFootprint.height,
      locked: false,
      reason: "Test.",
    };

    const analysis = analyzePlacements([tomato, basil], beds, []);
    const basilScore = analysis.placements.find((placement) => placement.placementId === "basil")!;

    expect(canInterplant("basil", "tomato")).toBe(true);
    expect(getPlantPositions(tomato, rightUpper)).toHaveLength(1);
    expect(basilScore.findings.some((finding) => finding.message.includes("interplanted with"))).toBe(true);
    expect(basilScore.findings.some((finding) => finding.message.includes("Overlaps crop block"))).toBe(
      false,
    );
  });

  it("warns when a declared interplant is too close to the host plant", () => {
    const rightUpper = beds.find((bed) => bed.id === "right-upper")!;
    const tomatoFootprint = getCropFootprint(cropById.tomato, rightUpper);
    const basilFootprint = getCropFootprint(cropById.basil, rightUpper);
    const tomato: Placement = {
      id: "tomato",
      cropId: "tomato",
      bedId: rightUpper.id,
      plantCount: 1,
      columns: 1,
      rows: 1,
      x: rightUpper.x + 20,
      y: rightUpper.y + 20,
      width: tomatoFootprint.width,
      height: tomatoFootprint.height,
      locked: false,
      reason: "Test.",
    };
    const basil: Placement = {
      id: "basil",
      cropId: "basil",
      bedId: rightUpper.id,
      mode: "interplant",
      hostPlacementId: tomato.id,
      plantCount: 1,
      columns: 1,
      rows: 1,
      x: tomato.x + tomatoFootprint.width / 2 - basilFootprint.width / 2,
      y: tomato.y + tomatoFootprint.height / 2 - basilFootprint.height / 2,
      width: basilFootprint.width,
      height: basilFootprint.height,
      locked: false,
      reason: "Test.",
    };

    const analysis = analyzePlacements([tomato, basil], beds, []);
    const basilScore = analysis.placements.find((placement) => placement.placementId === "basil")!;

    expect(basilScore.findings.some((finding) => finding.message.includes("too close"))).toBe(true);
  });
});
