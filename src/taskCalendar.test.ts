import { describe, expect, it } from "vitest";
import { generateGardenTasks } from "./taskCalendar";
import type { Placement } from "./planner";

const tomato: Placement = {
  id: "tomato",
  cropId: "tomato",
  bedId: "right-upper",
  status: "planned",
  plannedStartDate: "2026-05-15",
  harvestDate: "2026-08-20",
  plantCount: 1,
  columns: 1,
  rows: 1,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  locked: false,
  reason: "Test tomato.",
};

describe("task calendar", () => {
  it("generates seedling, bed prep, transplant, and harvest tasks for dated transplant crops", () => {
    const tasks = generateGardenTasks([tomato]);

    expect(tasks.map((task) => task.type)).toEqual([
      "prepare-seedlings",
      "bed-preparation",
      "plant-in-bed",
      "harvest",
    ]);
    expect(tasks.find((task) => task.type === "prepare-seedlings")?.dueDate).toBe("2026-04-03");
    expect(tasks.find((task) => task.type === "bed-preparation")?.dueDate).toBe("2026-05-08");
    expect(tasks.find((task) => task.type === "plant-in-bed")?.dueDate).toBe("2026-05-15");
    expect(tasks.find((task) => task.type === "harvest")?.dueDate).toBe("2026-08-20");
  });

  it("generates direct sow tasks for non-transplant crops", () => {
    const carrot: Placement = {
      ...tomato,
      id: "carrot",
      cropId: "carrot",
      plannedStartDate: "2026-03-15",
      harvestDate: undefined,
    };
    const tasks = generateGardenTasks([carrot]);

    expect(tasks.map((task) => task.type)).toEqual(["bed-preparation", "direct-sow"]);
    expect(tasks.find((task) => task.type === "direct-sow")?.title).toBe("Sow Carrot");
  });

  it("uses replacement planting tasks for replacement crop blocks", () => {
    const lettuceReplacement: Placement = {
      ...tomato,
      id: "lettuce-replacement-1",
      cropId: "lettuce",
      plannedStartDate: "2026-08-21",
      harvestDate: undefined,
      reason: "Lettuce replaces harvested Tomato in the same bed area.",
    };
    const tasks = generateGardenTasks([lettuceReplacement]);

    expect(tasks.map((task) => task.type)).toEqual(["bed-preparation", "plant-replacement"]);
    expect(tasks.find((task) => task.type === "plant-replacement")?.dueDate).toBe("2026-08-21");
  });

  it("marks already planted, harvested, and removed dated actions as done by default", () => {
    const removedTomato: Placement = {
      ...tomato,
      status: "removed",
      plantedDate: "2026-05-15",
      harvestDate: "2026-08-20",
      removedDate: "2026-09-01",
    };
    const tasks = generateGardenTasks([removedTomato]);

    expect(tasks.find((task) => task.type === "plant-in-bed")?.status).toBe("done");
    expect(tasks.find((task) => task.type === "harvest")?.status).toBe("done");
    expect(tasks.find((task) => task.type === "remove-crop")?.status).toBe("done");
  });

  it("applies persisted task status overrides by stable task id", () => {
    const taskId = "tomato:plant-in-bed:2026-05-15";
    const tasks = generateGardenTasks([tomato], {
      [taskId]: { status: "skipped" },
    });

    expect(tasks.find((task) => task.id === taskId)?.status).toBe("skipped");
  });
});
