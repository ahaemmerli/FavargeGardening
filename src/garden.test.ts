import { describe, expect, it } from "vitest";
import {
  beds,
  clampRectToBoundary,
  chooseScaleBarMeters,
  clampRectSizeToBed,
  clampRectToBed,
  centimetersToSvgHeight,
  centimetersToSvgWidth,
  createDefaultGardenDefinition,
  drawingMmToRealMeters,
  defaultGardenViewBox,
  findBedAtPoint,
  findContainingBed,
  formatScaleBarLabel,
  getBedLabel,
  metersToSvgFromScale,
  metersToSvgHeight,
  metersToSvgWidth,
  normalizeGardenDefinition,
  panViewBox,
  parseGardenDefinitionFromSvg,
  svgUnitsToDrawingMm,
  svgUnitsToRealMeters,
  zoomViewBox,
} from "./garden";

describe("garden geometry", () => {
  it("uses the drawing scale where 1 drawing mm equals 50 real mm", () => {
    expect(drawingMmToRealMeters(1)).toBe(0.05);
    expect(svgUnitsToDrawingMm(96 / 25.4)).toBeCloseTo(1);
    expect(svgUnitsToRealMeters(96 / 25.4)).toBe(0.05);
    expect(metersToSvgFromScale(1)).toBeCloseTo(75.59, 2);
  });

  it("derives real-world bed dimensions from the scaled SVG geometry", () => {
    const garden = createDefaultGardenDefinition();
    const leftLower = beds.find((bed) => bed.id === "left-lower");
    const rightUpper = beds.find((bed) => bed.id === "right-upper");

    expect(garden.name).toBe("Favarge garden");
    expect(garden.locked).toBe(false);
    expect(garden.beds).toHaveLength(4);
    expect(garden.accessZones).toHaveLength(5);
    expect(garden.accessZones.some((zone) => zone.kind === "path")).toBe(true);
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

  it("converts centimeters to SVG units for crop footprints", () => {
    const rightUpper = beds.find((bed) => bed.id === "right-upper")!;

    expect(centimetersToSvgWidth(rightUpper, 100)).toBeCloseTo(75.59, 2);
    expect(centimetersToSvgHeight(rightUpper, 25)).toBeCloseTo(18.9, 1);
  });

  it("finds whether a crop block is contained by a planting bed", () => {
    expect(findContainingBed({ x: 390, y: 140, width: 80, height: 50 })?.id).toBe("right-upper");
    expect(findContainingBed({ x: 320, y: 140, width: 40, height: 50 })).toBeUndefined();
    expect(findBedAtPoint(400, 150)?.id).toBe("right-upper");
    expect(findBedAtPoint(340, 150)).toBeUndefined();
  });

  it("clamps crop block movement and resize to a bed", () => {
    const rightUpper = beds.find((bed) => bed.id === "right-upper")!;
    const moved = clampRectToBed({ x: 720, y: 90, width: 80, height: 40 }, rightUpper);
    const resized = clampRectSizeToBed({ x: 700, y: 180, width: 140, height: 80 }, rightUpper);

    expect(moved.x + moved.width).toBeLessThanOrEqual(rightUpper.x + rightUpper.width);
    expect(moved.y).toBe(rightUpper.y);
    expect(resized.width).toBeCloseTo(rightUpper.x + rightUpper.width - 700);
    expect(resized.height).toBeCloseTo(rightUpper.y + rightUpper.height - 180);
  });

  it("clamps manually edited rectangles to the garden boundary", () => {
    const boundary = { x: 10, y: 20, width: 100, height: 80 };
    const moved = clampRectToBoundary({ x: 200, y: -50, width: 30, height: 20 }, boundary);
    const oversized = clampRectToBoundary({ x: 0, y: 0, width: 200, height: 120 }, boundary);

    expect(moved).toEqual({ x: 80, y: 20, width: 30, height: 20 });
    expect(oversized).toEqual({ x: 10, y: 20, width: 100, height: 80 });
  });

  it("parses beds and paths from an SVG file", () => {
    const imported = parseGardenDefinitionFromSvg(
      `
      <svg viewBox="0 0 100 100">
        <rect id="bed-a" style="fill:#ffffff" x="10" y="12" width="30" height="8" />
        <rect id="path-a" style="fill:#00ff00" x="10" y="22" width="30" height="5" />
      </svg>
      `,
      "garden.svg",
    );

    expect(imported.name).toBe("garden");
    expect(imported.sourceDrawing).toBe("garden.svg");
    expect(imported.beds).toHaveLength(1);
    expect(imported.beds[0]).toMatchObject({ id: "bed-a", x: 10, y: 12, width: 30, height: 8 });
    expect(imported.accessZones).toHaveLength(1);
    expect(imported.accessZones[0]).toMatchObject({ id: "path-a", kind: "access" });
  });

  it("normalizes saved garden definitions without dropping custom beds or paths", () => {
    const saved = normalizeGardenDefinition({
      id: "custom",
      name: "Custom garden",
      locked: true,
      boundary: { x: 1, y: 2, width: 300, height: 200 },
      beds: [{ id: "custom-bed", name: "Custom bed", x: 10, y: 20, width: 30, height: 40, sun: "partial" }],
      accessZones: [{ id: "custom-path", name: "Custom path", x: 50, y: 60, width: 70, height: 8 }],
    });

    expect(saved.name).toBe("Custom garden");
    expect(saved.locked).toBe(true);
    expect(saved.boundary).toEqual({ x: 1, y: 2, width: 300, height: 200 });
    expect(saved.beds).toHaveLength(1);
    expect(saved.beds[0]).toMatchObject({ id: "custom-bed", sun: "partial" });
    expect(saved.accessZones).toHaveLength(1);
    expect(saved.accessZones[0]).toMatchObject({ id: "custom-path", kind: "path" });
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

  it("chooses a readable scale bar for the current map view", () => {
    expect(chooseScaleBarMeters(defaultGardenViewBox)).toBe(2);
    expect(formatScaleBarLabel(2)).toBe("2 m");
    expect(formatScaleBarLabel(0.5)).toBe("50 cm");
  });
});
