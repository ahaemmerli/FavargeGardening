import { describe, expect, it } from "vitest";
import {
  calculateGardenValueScore,
  cropById,
  crops,
  describeGardenValue,
  describeYieldEstimate,
  suggestAdditionalCrops,
  type CropRequest,
} from "./cropCatalog";
import {
  analyzePlacements,
  createSuggestions,
  getBlockLayoutFromSize,
  getBlockLayout,
  getCompanionSummary,
  getCropFootprint,
  getDefaultPlantsPerBlock,
  getStarterPlantsForIntent,
  type Placement,
} from "./planner";
import { beds, centimetersToSvgHeight, centimetersToSvgWidth } from "./garden";

function request(cropId: CropRequest["cropId"], intent: CropRequest["intent"] = "normal"): CropRequest {
  return { cropId, priority: "must", intent };
}

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
    expect(crops.length).toBeGreaterThanOrEqual(10);

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
});
