import { describe, expect, it } from "vitest";
import { createSuggestions, getCompanionSummary, type CropRequest, type Placement } from "./planner";

const emptyRequests: CropRequest = {
  tomato: 0,
  basil: 0,
  carrot: 0,
  lettuce: 0,
  bean: 0,
  cabbage: 0,
};

describe("planner", () => {
  it("creates one placement for each requested crop count", () => {
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
    expect(suggestions.every((placement) => placement.locked === false)).toBe(true);
  });

  it("keeps locked placements and only fills missing requested quantity", () => {
    const lockedTomato: Placement = {
      id: "locked-tomato",
      cropId: "tomato",
      bedId: "right-upper",
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
});
