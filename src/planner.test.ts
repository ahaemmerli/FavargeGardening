import { describe, expect, it } from "vitest";
import {
  createSuggestions,
  cropById,
  getBlockLayoutFromSize,
  getBlockLayout,
  getCompanionSummary,
  getCropFootprint,
  getDefaultPlantsPerBlock,
  type CropRequest,
  type Placement,
} from "./planner";
import { beds, centimetersToSvgHeight, centimetersToSvgWidth } from "./garden";

const emptyRequests: CropRequest = {
  tomato: 0,
  basil: 0,
  carrot: 0,
  lettuce: 0,
  bean: 0,
  cabbage: 0,
};

describe("planner", () => {
  it("creates one placement block for each large requested crop count", () => {
    const suggestions = createSuggestions(
      {
        ...emptyRequests,
        tomato: 2,
        basil: 1,
      },
      [],
      123,
    );

    expect(suggestions).toHaveLength(3);
    expect(suggestions.filter((placement) => placement.cropId === "tomato")).toHaveLength(2);
    expect(suggestions.filter((placement) => placement.cropId === "basil")).toHaveLength(1);
    expect(suggestions.filter((placement) => placement.cropId === "tomato")[0].plantCount).toBe(1);
    expect(suggestions.filter((placement) => placement.cropId === "basil")[0].plantCount).toBe(1);
    expect(suggestions.every((placement) => placement.locked === false)).toBe(true);
  });

  it("groups small crops into planting blocks with multiple plants", () => {
    const suggestions = createSuggestions({ ...emptyRequests, carrot: 24 }, [], 234);
    const carrotBlocks = suggestions.filter((placement) => placement.cropId === "carrot");

    expect(getDefaultPlantsPerBlock(cropById.carrot)).toBe(12);
    expect(carrotBlocks).toHaveLength(2);
    expect(carrotBlocks.map((placement) => placement.plantCount)).toEqual([12, 12]);
    expect(carrotBlocks[0].columns).toBe(4);
    expect(carrotBlocks[0].rows).toBe(3);
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
    const suggestions = createSuggestions({ ...emptyRequests, tomato: 1, carrot: 1 }, [], 789);
    const tomato = suggestions.find((placement) => placement.cropId === "tomato")!;
    const carrot = suggestions.find((placement) => placement.cropId === "carrot")!;

    expect(tomatoFootprint.width).toBeCloseTo(centimetersToSvgWidth(rightUpper, 60));
    expect(tomatoFootprint.height).toBeCloseTo(centimetersToSvgHeight(rightUpper, 60));
    expect(getBlockLayout(cropById.carrot, rightUpper, 12).width).toBeCloseTo(carrotFootprint.width * 4);
    expect(getBlockLayout(cropById.carrot, rightUpper, 12).height).toBeCloseTo(carrotFootprint.height * 3);
    expect(tomato.width).toBeCloseTo(tomatoFootprint.width);
    expect(tomato.height).toBeCloseTo(tomatoFootprint.height);
    expect(carrot.width).toBeCloseTo(carrotFootprint.width);
    expect(carrot.height).toBeCloseTo(carrotFootprint.height);
    expect(carrot.width).toBeLessThan(tomato.width);
  });

  it("keeps locked placements and only fills missing requested quantity", () => {
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

    const suggestions = createSuggestions({ ...emptyRequests, tomato: 2 }, [lockedTomato], 456);

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toEqual(lockedTomato);
    expect(suggestions.filter((placement) => placement.cropId === "tomato")).toHaveLength(2);
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
    const suggestions = createSuggestions({ ...emptyRequests, lettuce: 1 }, [], 987, customBeds);

    expect(suggestions[0].bedId).toBe("right-upper");
    expect(suggestions[0].reason).toContain("Sunny renamed bed");
  });
});
