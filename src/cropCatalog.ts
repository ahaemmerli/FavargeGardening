export type CropId =
  | "tomato"
  | "basil"
  | "carrot"
  | "lettuce"
  | "bean"
  | "cabbage"
  | "cucumber"
  | "zucchini"
  | "radish"
  | "chard"
  | "parsley"
  | "potato";

export type CropPriority = "must" | "nice" | "optional";
export type CropIntent = "some" | "normal" | "lots";
export type GardenValueRating = 1 | 2 | 3 | 4 | 5;

export type YieldEstimate = {
  amount: number;
  unit: "kg" | "g" | "heads" | "bunches" | "pods" | "pieces";
  basis: "perPlant" | "perSquareMeter";
  range?: {
    low: number;
    high: number;
  };
  source: string;
};

export type GardenValue = {
  flavorGain: GardenValueRating;
  marketPrice: GardenValueRating;
  freshnessImportance: GardenValueRating;
  availability: GardenValueRating;
  rarity: GardenValueRating;
  spaceEfficiency: GardenValueRating;
  storageValue: GardenValueRating;
};

export type Crop = {
  id: CropId;
  name: string;
  latinName: string;
  category: string;
  family: string;
  water: "low" | "medium" | "high";
  sun: "partial" | "full";
  color: string;
  spacingCm: {
    inRow: number;
    betweenRows: number;
  };
  spacingSource: string;
  yieldEstimate: YieldEstimate;
  gardenValue: GardenValue;
  swissSuitability: "excellent" | "good" | "possible";
  smallGardenSuitability: "excellent" | "good" | "poor";
  plantingWindow: string;
  harvestWindow: string;
  tags: string[];
  companions: CropId[];
  avoid: CropId[];
};

export type CropRequest = {
  cropId: CropId;
  priority: CropPriority;
  intent: CropIntent;
};

export type AdditionalCropSuggestion = {
  crop: Crop;
  score: number;
  reasons: string[];
};

export const crops: Crop[] = [
  {
    id: "tomato",
    name: "Tomato",
    latinName: "Solanum lycopersicum",
    category: "Fruit vegetable",
    family: "Nightshade",
    water: "high",
    sun: "full",
    color: "#d94f38",
    spacingCm: { inRow: 60, betweenRows: 60 },
    spacingSource: "Starter catalog: NC State intensive tomato spacing rounded to 60 cm.",
    yieldEstimate: {
      amount: 4,
      unit: "kg",
      basis: "perPlant",
      range: { low: 2.5, high: 5 },
      source: "Starter estimate for productive garden tomatoes.",
    },
    gardenValue: {
      flavorGain: 5,
      marketPrice: 4,
      freshnessImportance: 5,
      availability: 3,
      rarity: 4,
      spaceEfficiency: 4,
      storageValue: 2,
    },
    swissSuitability: "good",
    smallGardenSuitability: "excellent",
    plantingWindow: "Transplant after frost, usually May",
    harvestWindow: "July to October",
    tags: ["high-value", "flavor", "heirloom", "needs-support"],
    companions: ["basil", "carrot", "lettuce", "parsley"],
    avoid: ["cabbage", "potato"],
  },
  {
    id: "basil",
    name: "Basil",
    latinName: "Ocimum basilicum",
    category: "Herb",
    family: "Mint",
    water: "medium",
    sun: "full",
    color: "#3f9b58",
    spacingCm: { inRow: 25, betweenRows: 25 },
    spacingSource: "Starter catalog: herb spacing placeholder, to verify against seed data.",
    yieldEstimate: {
      amount: 8,
      unit: "bunches",
      basis: "perPlant",
      range: { low: 5, high: 12 },
      source: "Starter estimate for repeat harvesting.",
    },
    gardenValue: {
      flavorGain: 5,
      marketPrice: 5,
      freshnessImportance: 5,
      availability: 3,
      rarity: 3,
      spaceEfficiency: 5,
      storageValue: 1,
    },
    swissSuitability: "good",
    smallGardenSuitability: "excellent",
    plantingWindow: "May to July",
    harvestWindow: "June to September",
    tags: ["high-value", "herb", "space-efficient", "interplant"],
    companions: ["tomato"],
    avoid: [],
  },
  {
    id: "carrot",
    name: "Carrot",
    latinName: "Daucus carota",
    category: "Root",
    family: "Umbellifer",
    water: "medium",
    sun: "full",
    color: "#e58935",
    spacingCm: { inRow: 10, betweenRows: 30 },
    spacingSource: "Starter catalog: RHS carrot spacing.",
    yieldEstimate: {
      amount: 3,
      unit: "kg",
      basis: "perSquareMeter",
      range: { low: 2, high: 4 },
      source: "Starter estimate for dense direct sowing.",
    },
    gardenValue: {
      flavorGain: 3,
      marketPrice: 2,
      freshnessImportance: 3,
      availability: 2,
      rarity: 3,
      spaceEfficiency: 4,
      storageValue: 4,
    },
    swissSuitability: "excellent",
    smallGardenSuitability: "good",
    plantingWindow: "March to July",
    harvestWindow: "June to November",
    tags: ["direct-sow", "storage", "succession"],
    companions: ["tomato", "lettuce", "bean"],
    avoid: [],
  },
  {
    id: "lettuce",
    name: "Lettuce",
    latinName: "Lactuca sativa",
    category: "Leaf",
    family: "Aster",
    water: "high",
    sun: "partial",
    color: "#78b74a",
    spacingCm: { inRow: 25, betweenRows: 30 },
    spacingSource: "Starter catalog: RHS raised-bed lettuce spacing.",
    yieldEstimate: {
      amount: 12,
      unit: "heads",
      basis: "perSquareMeter",
      range: { low: 8, high: 14 },
      source: "Starter estimate for small heads or cut-and-come-again planting.",
    },
    gardenValue: {
      flavorGain: 4,
      marketPrice: 3,
      freshnessImportance: 5,
      availability: 2,
      rarity: 3,
      spaceEfficiency: 5,
      storageValue: 1,
    },
    swissSuitability: "excellent",
    smallGardenSuitability: "excellent",
    plantingWindow: "March to August",
    harvestWindow: "April to October",
    tags: ["quick", "succession", "space-efficient"],
    companions: ["carrot", "tomato", "radish"],
    avoid: [],
  },
  {
    id: "bean",
    name: "Bean",
    latinName: "Phaseolus vulgaris",
    category: "Legume",
    family: "Legume",
    water: "medium",
    sun: "full",
    color: "#2f8f7c",
    spacingCm: { inRow: 10, betweenRows: 45 },
    spacingSource: "Starter catalog: RHS French bean spacing.",
    yieldEstimate: {
      amount: 1.2,
      unit: "kg",
      basis: "perSquareMeter",
      range: { low: 0.8, high: 1.8 },
      source: "Starter estimate for bush beans.",
    },
    gardenValue: {
      flavorGain: 4,
      marketPrice: 3,
      freshnessImportance: 4,
      availability: 3,
      rarity: 3,
      spaceEfficiency: 4,
      storageValue: 2,
    },
    swissSuitability: "good",
    smallGardenSuitability: "good",
    plantingWindow: "May to July",
    harvestWindow: "July to September",
    tags: ["productive", "nitrogen", "direct-sow"],
    companions: ["carrot", "cabbage", "chard"],
    avoid: [],
  },
  {
    id: "cabbage",
    name: "Cabbage",
    latinName: "Brassica oleracea var. capitata",
    category: "Brassica",
    family: "Brassica",
    water: "high",
    sun: "full",
    color: "#6b8f42",
    spacingCm: { inRow: 45, betweenRows: 45 },
    spacingSource: "Starter catalog: CSU cabbage spacing rounded from 18 inches.",
    yieldEstimate: {
      amount: 1,
      unit: "heads",
      basis: "perPlant",
      source: "Starter estimate for headed cabbage.",
    },
    gardenValue: {
      flavorGain: 2,
      marketPrice: 2,
      freshnessImportance: 2,
      availability: 2,
      rarity: 2,
      spaceEfficiency: 2,
      storageValue: 4,
    },
    swissSuitability: "excellent",
    smallGardenSuitability: "poor",
    plantingWindow: "March to July",
    harvestWindow: "June to November",
    tags: ["storage", "space-hungry", "rotation-sensitive"],
    companions: ["bean"],
    avoid: ["tomato"],
  },
  {
    id: "cucumber",
    name: "Cucumber",
    latinName: "Cucumis sativus",
    category: "Fruit vegetable",
    family: "Cucurbit",
    water: "high",
    sun: "full",
    color: "#4d9a4f",
    spacingCm: { inRow: 45, betweenRows: 60 },
    spacingSource: "Starter catalog: compact trellised cucumber estimate.",
    yieldEstimate: {
      amount: 12,
      unit: "pieces",
      basis: "perPlant",
      range: { low: 8, high: 18 },
      source: "Starter estimate for trellised garden cucumber.",
    },
    gardenValue: {
      flavorGain: 4,
      marketPrice: 3,
      freshnessImportance: 4,
      availability: 2,
      rarity: 3,
      spaceEfficiency: 3,
      storageValue: 1,
    },
    swissSuitability: "good",
    smallGardenSuitability: "good",
    plantingWindow: "May to June",
    harvestWindow: "July to September",
    tags: ["trellis", "productive", "warm-season"],
    companions: ["bean", "radish"],
    avoid: [],
  },
  {
    id: "zucchini",
    name: "Zucchini",
    latinName: "Cucurbita pepo",
    category: "Fruit vegetable",
    family: "Cucurbit",
    water: "high",
    sun: "full",
    color: "#6c9f44",
    spacingCm: { inRow: 90, betweenRows: 90 },
    spacingSource: "Starter catalog: compact bush zucchini estimate.",
    yieldEstimate: {
      amount: 4,
      unit: "kg",
      basis: "perPlant",
      range: { low: 3, high: 7 },
      source: "Starter estimate for productive zucchini plants.",
    },
    gardenValue: {
      flavorGain: 3,
      marketPrice: 2,
      freshnessImportance: 3,
      availability: 2,
      rarity: 2,
      spaceEfficiency: 2,
      storageValue: 1,
    },
    swissSuitability: "good",
    smallGardenSuitability: "poor",
    plantingWindow: "May to June",
    harvestWindow: "July to September",
    tags: ["productive", "space-hungry", "warm-season"],
    companions: ["bean"],
    avoid: [],
  },
  {
    id: "radish",
    name: "Radish",
    latinName: "Raphanus sativus",
    category: "Root",
    family: "Brassica",
    water: "medium",
    sun: "partial",
    color: "#c94f70",
    spacingCm: { inRow: 5, betweenRows: 15 },
    spacingSource: "Starter catalog: common radish spacing.",
    yieldEstimate: {
      amount: 60,
      unit: "pieces",
      basis: "perSquareMeter",
      range: { low: 40, high: 80 },
      source: "Starter estimate for dense quick sowing.",
    },
    gardenValue: {
      flavorGain: 3,
      marketPrice: 3,
      freshnessImportance: 4,
      availability: 3,
      rarity: 3,
      spaceEfficiency: 5,
      storageValue: 1,
    },
    swissSuitability: "excellent",
    smallGardenSuitability: "excellent",
    plantingWindow: "March to September",
    harvestWindow: "April to October",
    tags: ["quick", "succession", "space-efficient"],
    companions: ["lettuce", "cucumber"],
    avoid: [],
  },
  {
    id: "chard",
    name: "Swiss chard",
    latinName: "Beta vulgaris subsp. vulgaris",
    category: "Leaf",
    family: "Amaranth",
    water: "medium",
    sun: "partial",
    color: "#8c4f8d",
    spacingCm: { inRow: 30, betweenRows: 40 },
    spacingSource: "Starter catalog: common chard spacing.",
    yieldEstimate: {
      amount: 1.5,
      unit: "kg",
      basis: "perSquareMeter",
      range: { low: 1, high: 2.5 },
      source: "Starter estimate for repeated leaf harvest.",
    },
    gardenValue: {
      flavorGain: 4,
      marketPrice: 3,
      freshnessImportance: 4,
      availability: 3,
      rarity: 4,
      spaceEfficiency: 4,
      storageValue: 2,
    },
    swissSuitability: "excellent",
    smallGardenSuitability: "excellent",
    plantingWindow: "April to July",
    harvestWindow: "June to November",
    tags: ["repeat-harvest", "leaf", "colorful"],
    companions: ["bean", "radish"],
    avoid: [],
  },
  {
    id: "parsley",
    name: "Parsley",
    latinName: "Petroselinum crispum",
    category: "Herb",
    family: "Umbellifer",
    water: "medium",
    sun: "partial",
    color: "#4f8f44",
    spacingCm: { inRow: 20, betweenRows: 25 },
    spacingSource: "Starter catalog: common parsley spacing.",
    yieldEstimate: {
      amount: 10,
      unit: "bunches",
      basis: "perPlant",
      range: { low: 6, high: 14 },
      source: "Starter estimate for repeat cutting.",
    },
    gardenValue: {
      flavorGain: 5,
      marketPrice: 4,
      freshnessImportance: 5,
      availability: 3,
      rarity: 3,
      spaceEfficiency: 5,
      storageValue: 1,
    },
    swissSuitability: "excellent",
    smallGardenSuitability: "excellent",
    plantingWindow: "March to July",
    harvestWindow: "May to November",
    tags: ["herb", "space-efficient", "repeat-harvest"],
    companions: ["tomato", "chard"],
    avoid: [],
  },
  {
    id: "potato",
    name: "Potato",
    latinName: "Solanum tuberosum",
    category: "Tuber",
    family: "Nightshade",
    water: "medium",
    sun: "full",
    color: "#b69b63",
    spacingCm: { inRow: 35, betweenRows: 70 },
    spacingSource: "Starter catalog: common potato spacing.",
    yieldEstimate: {
      amount: 2,
      unit: "kg",
      basis: "perPlant",
      range: { low: 1, high: 3 },
      source: "Starter estimate for maincrop potatoes.",
    },
    gardenValue: {
      flavorGain: 2,
      marketPrice: 1,
      freshnessImportance: 2,
      availability: 1,
      rarity: 2,
      spaceEfficiency: 1,
      storageValue: 5,
    },
    swissSuitability: "excellent",
    smallGardenSuitability: "poor",
    plantingWindow: "March to April",
    harvestWindow: "June to September",
    tags: ["storage", "space-hungry", "low-practical-value"],
    companions: ["bean", "cabbage"],
    avoid: ["tomato"],
  },
];

export const cropById = Object.fromEntries(crops.map((crop) => [crop.id, crop])) as Record<CropId, Crop>;

export function describeWater(water: Crop["water"]) {
  return water === "high" ? "High water" : water === "medium" ? "Moderate water" : "Low water";
}

export function calculateGardenValueScore(crop: Crop) {
  const value =
    crop.gardenValue.flavorGain * 0.25 +
    crop.gardenValue.freshnessImportance * 0.2 +
    crop.gardenValue.marketPrice * 0.15 +
    crop.gardenValue.availability * 0.15 +
    crop.gardenValue.rarity * 0.1 +
    crop.gardenValue.spaceEfficiency * 0.1 +
    crop.gardenValue.storageValue * 0.05;

  return Math.round(value * 20);
}

export function describeGardenValue(score: number) {
  if (score >= 82) return "Excellent garden value";
  if (score >= 68) return "High garden value";
  if (score >= 52) return "Good garden value";
  return "Grow mainly by preference";
}

export function describeYieldEstimate(crop: Crop, quantity = 1) {
  const estimate = crop.yieldEstimate;
  const basis = estimate.basis === "perPlant" ? "plant" : "m2";
  const multiplier = estimate.basis === "perPlant" ? quantity : 1;
  const amount = estimate.range
    ? `${Number((estimate.range.low * multiplier).toFixed(1)).toString()}-${Number(
        (estimate.range.high * multiplier).toFixed(1),
      ).toString()}`
    : Number((estimate.amount * multiplier).toFixed(1)).toString();

  if (estimate.basis === "perSquareMeter") return `${amount} ${estimate.unit} / ${basis}`;

  return `${amount} ${estimate.unit} / ${quantity === 1 ? basis : `${quantity} ${basis}s`}`;
}

export function describeCropIntent(intent: CropIntent) {
  if (intent === "some") return "Some";
  if (intent === "lots") return "Lots";
  return "Normal";
}

export function suggestAdditionalCrops(requests: CropRequest[], limit = 4): AdditionalCropSuggestion[] {
  const requestedIds = new Set(requests.map((request) => request.cropId));

  return crops
    .filter((crop) => !requestedIds.has(crop.id) && crop.smallGardenSuitability !== "poor")
    .map((crop) => {
      const companionMatches = requests.filter((request) => crop.companions.includes(request.cropId));
      const conflictMatches = requests.filter((request) => crop.avoid.includes(request.cropId));
      const score =
        calculateGardenValueScore(crop) +
        companionMatches.length * 12 -
        conflictMatches.length * 18 +
        (crop.smallGardenSuitability === "excellent" ? 10 : 0);
      const reasons = [
        describeGardenValue(calculateGardenValueScore(crop)),
        crop.smallGardenSuitability === "excellent"
          ? "Excellent for small gardens"
          : "Good for small gardens",
      ];

      if (companionMatches.length > 0) {
        reasons.push(
          `Companion for ${companionMatches.map((request) => cropById[request.cropId].name).join(", ")}`,
        );
      }

      if (crop.tags.includes("space-efficient")) reasons.push("Uses little space");

      return { crop, score, reasons };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
