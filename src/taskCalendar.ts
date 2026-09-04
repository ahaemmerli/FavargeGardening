import { cropById, type CropId } from "./cropCatalog";
import type { Placement } from "./planner";

export type GardenTaskType =
  | "prepare-seedlings"
  | "direct-sow"
  | "plant-in-bed"
  | "bed-preparation"
  | "harvest"
  | "remove-crop"
  | "plant-replacement";

export type GardenTaskStatus = "planned" | "done" | "skipped";

export type GardenTaskPriority = "normal" | "high";

export type GardenTaskOverride = {
  status?: GardenTaskStatus;
};

export type GardenTask = {
  id: string;
  type: GardenTaskType;
  cropId: CropId;
  placementId: string;
  dueDate: string;
  status: GardenTaskStatus;
  priority: GardenTaskPriority;
  title: string;
  details: string;
  reason: string;
};

function isIsoDate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);

  return parsed.toISOString().slice(0, 10);
}

function createTaskId(placement: Placement, type: GardenTaskType, dueDate: string) {
  return `${placement.id}:${type}:${dueDate}`;
}

function isTransplantCrop(cropId: CropId) {
  const crop = cropById[cropId];

  return crop.plantingWindow.toLowerCase().includes("transplant");
}

function isReplacementPlacement(placement: Placement) {
  return (
    placement.id.includes("replacement") || placement.reason.toLowerCase().includes("replaces harvested")
  );
}

function defaultTaskStatus(placement: Placement, type: GardenTaskType): GardenTaskStatus {
  if (
    (type === "plant-in-bed" || type === "direct-sow" || type === "plant-replacement") &&
    (placement.status === "planted" || placement.status === "harvested" || placement.status === "removed")
  ) {
    return "done";
  }

  if (type === "harvest" && (placement.status === "harvested" || placement.status === "removed")) {
    return "done";
  }

  if (type === "remove-crop" && placement.status === "removed") {
    return "done";
  }

  return "planned";
}

function createTask(
  placement: Placement,
  type: GardenTaskType,
  dueDate: string,
  priority: GardenTaskPriority,
  title: string,
  details: string,
  reason: string,
  overrides: Record<string, GardenTaskOverride>,
) {
  const id = createTaskId(placement, type, dueDate);

  return {
    id,
    type,
    cropId: placement.cropId,
    placementId: placement.id,
    dueDate,
    status: overrides[id]?.status ?? defaultTaskStatus(placement, type),
    priority,
    title,
    details,
    reason,
  } satisfies GardenTask;
}

export function generateGardenTasks(
  placements: Placement[],
  overrides: Record<string, GardenTaskOverride> = {},
) {
  const tasks: GardenTask[] = [];

  for (const placement of placements) {
    const crop = cropById[placement.cropId];
    const startDate = placement.plantedDate ?? placement.plannedStartDate;

    if (isIsoDate(startDate)) {
      tasks.push(
        createTask(
          placement,
          "bed-preparation",
          addDays(startDate, -7),
          "normal",
          `Prepare bed for ${crop.name}`,
          "Clear old material, loosen only where needed, add compost or mulch, and confirm irrigation access.",
          `Generated one week before the planned ${crop.name} planting date.`,
          overrides,
        ),
      );

      if (isReplacementPlacement(placement)) {
        tasks.push(
          createTask(
            placement,
            "plant-replacement",
            startDate,
            "high",
            `Plant replacement ${crop.name}`,
            "Use the selected follow-up crop block and plant into the released bed area.",
            "Generated from a replacement crop block.",
            overrides,
          ),
        );
      } else if (isTransplantCrop(placement.cropId)) {
        tasks.push(
          createTask(
            placement,
            "prepare-seedlings",
            addDays(startDate, -42),
            "normal",
            `Prepare ${crop.name} seedlings`,
            "Start or buy seedlings early enough for the planned bed planting date.",
            `Generated six weeks before the planned ${crop.name} transplant date.`,
            overrides,
          ),
          createTask(
            placement,
            "plant-in-bed",
            startDate,
            "high",
            `Transplant ${crop.name}`,
            "Plant seedlings into the assigned bed block and update the crop block status to planted.",
            `Generated from the ${crop.name} planned start date.`,
            overrides,
          ),
        );
      } else {
        tasks.push(
          createTask(
            placement,
            "direct-sow",
            startDate,
            "high",
            `Sow ${crop.name}`,
            "Direct sow into the assigned bed block and update the crop block status to planted when done.",
            `Generated from the ${crop.name} planned start date.`,
            overrides,
          ),
        );
      }
    }

    if (isIsoDate(placement.harvestDate)) {
      tasks.push(
        createTask(
          placement,
          "harvest",
          placement.harvestDate,
          "high",
          `Harvest ${crop.name}`,
          "Harvest the crop block and decide whether to keep harvesting, remove it, or create a replacement crop.",
          `Generated from the ${crop.name} harvest date.`,
          overrides,
        ),
      );
    }

    if (isIsoDate(placement.removedDate)) {
      tasks.push(
        createTask(
          placement,
          "remove-crop",
          placement.removedDate,
          "normal",
          `Remove ${crop.name}`,
          "Clear the crop block, record the removal, and prepare the area for a follow-up crop if useful.",
          `Generated from the ${crop.name} removal date.`,
          overrides,
        ),
      );
    }
  }

  return tasks.sort((left, right) => {
    if (left.dueDate !== right.dueDate) return left.dueDate.localeCompare(right.dueDate);
    if (left.priority !== right.priority) return left.priority === "high" ? -1 : 1;

    return left.title.localeCompare(right.title);
  });
}
