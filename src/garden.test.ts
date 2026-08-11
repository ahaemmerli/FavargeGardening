import { describe, expect, it } from "vitest";
import {
  beds,
  defaultGardenViewBox,
  findContainingBed,
  getBedLabel,
  metersToSvgHeight,
  metersToSvgWidth,
  panViewBox,
  zoomViewBox,
} from "./garden";

describe("garden geometry", () => {
  it("stores real-world bed dimensions with the measured geometry", () => {
    const leftLower = beds.find((bed) => bed.id === "left-lower");
    const rightUpper = beds.find((bed) => bed.id === "right-upper");

    expect(leftLower).toBeDefined();
    expect(rightUpper).toBeDefined();
    expect(getBedLabel(leftLower!)).toBe("3 m x 1 m");
    expect(getBedLabel(rightUpper!)).toBe("5 m x 1.25 m");
  });

  it("converts meters to SVG units per bed axis", () => {
    const rightUpper = beds.find((bed) => bed.id === "right-upper")!;

    expect(metersToSvgWidth(rightUpper, 5)).toBeCloseTo(rightUpper.width);
    expect(metersToSvgHeight(rightUpper, 1.25)).toBeCloseTo(rightUpper.height);
    expect(metersToSvgWidth(rightUpper, 1)).toBeCloseTo(75.59, 2);
  });

  it("finds whether a crop block is contained by a planting bed", () => {
    expect(findContainingBed({ x: 390, y: 140, width: 80, height: 50 })?.id).toBe("right-upper");
    expect(findContainingBed({ x: 320, y: 140, width: 40, height: 50 })).toBeUndefined();
  });

  it("pans and zooms view boxes around the current map view", () => {
    expect(panViewBox(defaultGardenViewBox, 10, -20)).toEqual({
      ...defaultGardenViewBox,
      x: defaultGardenViewBox.x + 10,
      y: defaultGardenViewBox.y - 20,
    });

    const zoomed = zoomViewBox(defaultGardenViewBox, 0.5);

    expect(zoomed.width).toBe(defaultGardenViewBox.width / 2);
    expect(zoomed.height).toBe(defaultGardenViewBox.height / 2);
    expect(zoomed.x + zoomed.width / 2).toBe(defaultGardenViewBox.x + defaultGardenViewBox.width / 2);
    expect(zoomed.y + zoomed.height / 2).toBe(defaultGardenViewBox.y + defaultGardenViewBox.height / 2);
  });
});
