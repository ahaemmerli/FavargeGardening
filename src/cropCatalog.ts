export type CropId =
  | "tomatoCherry"
  | "tomato"
  | "tomatoBeefsteak"
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
  | "potato"
  | "arugula"
  | "cornSalad"
  | "pakChoi"
  | "daikon"
  | "kohlrabi"
  | "kale"
  | "leek"
  | "onion"
  | "beetroot"
  | "parsnip"
  | "broccoli"
  | "fennel"
  | "eggplant"
  | "pepper"
  | "winterSquash";

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
  placementMode?: "auto" | "standalone" | "interplant" | "border";
};

export type AdditionalCropSuggestion = {
  crop: Crop;
  score: number;
  reasons: string[];
};

export type CropSeasonFilter = "all" | "spring" | "summer" | "autumn";

export type CropCatalogFilters = {
  search: string;
  category: string;
  sun: "all" | Crop["sun"];
  water: "all" | Crop["water"];
  suitability: "all" | Crop["smallGardenSuitability"];
  season: CropSeasonFilter;
  highValueOnly: boolean;
};

export const tomatoCropIds: CropId[] = ["tomatoCherry", "tomato", "tomatoBeefsteak"];

export const crops: Crop[] = [
  {
    id: "tomatoCherry",
    name: "Tomato, cherry",
    latinName: "Solanum lycopersicum var. cerasiforme",
    category: "Fruit vegetable",
    family: "Nightshade",
    water: "high",
    sun: "full",
    color: "#e85d42",
    spacingCm: { inRow: 45, betweenRows: 60 },
    spacingSource: "Starter catalog: compact staked cherry tomato spacing.",
    yieldEstimate: {
      amount: 3,
      unit: "kg",
      basis: "perPlant",
      range: { low: 1.5, high: 4 },
      source: "Starter estimate for productive cherry tomatoes.",
    },
    gardenValue: {
      flavorGain: 5,
      marketPrice: 5,
      freshnessImportance: 5,
      availability: 3,
      rarity: 4,
      spaceEfficiency: 5,
      storageValue: 1,
    },
    swissSuitability: "good",
    smallGardenSuitability: "excellent",
    plantingWindow: "Transplant after frost, usually May",
    harvestWindow: "July to October",
    tags: ["high-value", "flavor", "cherry", "snack", "needs-support"],
    companions: ["basil", "carrot", "lettuce", "parsley"],
    avoid: ["cabbage", "potato"],
  },
  {
    id: "tomato",
    name: "Tomato, medium",
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
    tags: ["high-value", "flavor", "medium", "heirloom", "needs-support"],
    companions: ["basil", "carrot", "lettuce", "parsley"],
    avoid: ["cabbage", "potato"],
  },
  {
    id: "tomatoBeefsteak",
    name: "Tomato, large meaty",
    latinName: "Solanum lycopersicum",
    category: "Fruit vegetable",
    family: "Nightshade",
    water: "high",
    sun: "full",
    color: "#c94135",
    spacingCm: { inRow: 70, betweenRows: 70 },
    spacingSource: "Starter catalog: larger staked beefsteak tomato spacing.",
    yieldEstimate: {
      amount: 4,
      unit: "kg",
      basis: "perPlant",
      range: { low: 2, high: 6 },
      source: "Starter estimate for large-fruited garden tomatoes.",
    },
    gardenValue: {
      flavorGain: 5,
      marketPrice: 5,
      freshnessImportance: 5,
      availability: 4,
      rarity: 5,
      spaceEfficiency: 3,
      storageValue: 2,
    },
    swissSuitability: "good",
    smallGardenSuitability: "good",
    plantingWindow: "Transplant after frost, usually May",
    harvestWindow: "July to October",
    tags: ["high-value", "flavor", "large-fruit", "beefsteak", "needs-support"],
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
    companions: tomatoCropIds,
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
    companions: [...tomatoCropIds, "lettuce", "bean"],
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
    companions: ["carrot", ...tomatoCropIds, "radish"],
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
    avoid: tomatoCropIds,
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
    companions: [...tomatoCropIds, "chard"],
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
    avoid: tomatoCropIds,
  },
  {
    id: "arugula",
    name: "Arugula",
    latinName: "Eruca vesicaria",
    category: "Leaf",
    family: "Brassica",
    water: "medium",
    sun: "partial",
    color: "#5c9f45",
    spacingCm: { inRow: 5, betweenRows: 15 },
    spacingSource: "Starter catalog: common rocket/arugula dense sowing estimate.",
    yieldEstimate: {
      amount: 0.8,
      unit: "kg",
      basis: "perSquareMeter",
      range: { low: 0.5, high: 1.2 },
      source: "Starter estimate for cut-and-come-again leaves.",
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
    plantingWindow: "March to September",
    harvestWindow: "April to November",
    tags: ["quick", "leaf", "space-efficient", "succession"],
    companions: ["lettuce", "radish", "carrot"],
    avoid: [],
  },
  {
    id: "cornSalad",
    name: "Corn salad",
    latinName: "Valerianella locusta",
    category: "Leaf",
    family: "Valerian",
    water: "medium",
    sun: "partial",
    color: "#477b4a",
    spacingCm: { inRow: 10, betweenRows: 15 },
    spacingSource: "Starter catalog: common lamb's lettuce/corn salad spacing estimate.",
    yieldEstimate: {
      amount: 0.7,
      unit: "kg",
      basis: "perSquareMeter",
      range: { low: 0.4, high: 1 },
      source: "Starter estimate for cool-season salad leaves.",
    },
    gardenValue: {
      flavorGain: 4,
      marketPrice: 4,
      freshnessImportance: 5,
      availability: 3,
      rarity: 3,
      spaceEfficiency: 5,
      storageValue: 1,
    },
    swissSuitability: "excellent",
    smallGardenSuitability: "excellent",
    plantingWindow: "August to October",
    harvestWindow: "October to March",
    tags: ["winter", "leaf", "space-efficient", "cool-season"],
    companions: ["carrot", "leek", "radish"],
    avoid: [],
  },
  {
    id: "pakChoi",
    name: "Pak choi",
    latinName: "Brassica rapa subsp. chinensis",
    category: "Asian green",
    family: "Brassica",
    water: "medium",
    sun: "partial",
    color: "#6fa64b",
    spacingCm: { inRow: 25, betweenRows: 30 },
    spacingSource: "Starter catalog: compact Asian green spacing estimate.",
    yieldEstimate: {
      amount: 8,
      unit: "heads",
      basis: "perSquareMeter",
      range: { low: 6, high: 10 },
      source: "Starter estimate for baby to medium pak choi.",
    },
    gardenValue: {
      flavorGain: 4,
      marketPrice: 4,
      freshnessImportance: 5,
      availability: 4,
      rarity: 4,
      spaceEfficiency: 4,
      storageValue: 1,
    },
    swissSuitability: "good",
    smallGardenSuitability: "excellent",
    plantingWindow: "April to May, July to September",
    harvestWindow: "May to June, August to November",
    tags: ["quick", "asian", "leaf", "succession"],
    companions: ["radish", "lettuce", "bean"],
    avoid: [],
  },
  {
    id: "daikon",
    name: "Daikon radish",
    latinName: "Raphanus sativus var. longipinnatus",
    category: "Root",
    family: "Brassica",
    water: "medium",
    sun: "full",
    color: "#d8ddd1",
    spacingCm: { inRow: 15, betweenRows: 30 },
    spacingSource: "Starter catalog: Asian radish spacing estimate.",
    yieldEstimate: {
      amount: 4,
      unit: "kg",
      basis: "perSquareMeter",
      range: { low: 2.5, high: 5 },
      source: "Starter estimate for long radish roots.",
    },
    gardenValue: {
      flavorGain: 3,
      marketPrice: 3,
      freshnessImportance: 3,
      availability: 4,
      rarity: 4,
      spaceEfficiency: 4,
      storageValue: 3,
    },
    swissSuitability: "good",
    smallGardenSuitability: "good",
    plantingWindow: "July to September",
    harvestWindow: "September to November",
    tags: ["root", "asian", "autumn", "storage"],
    companions: ["lettuce", "bean", "pakChoi"],
    avoid: [],
  },
  {
    id: "kohlrabi",
    name: "Kohlrabi",
    latinName: "Brassica oleracea var. gongylodes",
    category: "Brassica",
    family: "Brassica",
    water: "medium",
    sun: "partial",
    color: "#9f78b8",
    spacingCm: { inRow: 25, betweenRows: 30 },
    spacingSource: "Starter catalog: common kohlrabi spacing estimate.",
    yieldEstimate: {
      amount: 1,
      unit: "pieces",
      basis: "perPlant",
      source: "Starter estimate for one bulb per plant.",
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
    swissSuitability: "excellent",
    smallGardenSuitability: "excellent",
    plantingWindow: "March to August",
    harvestWindow: "May to October",
    tags: ["quick", "brassica", "space-efficient"],
    companions: ["bean", "lettuce", "beetroot"],
    avoid: tomatoCropIds,
  },
  {
    id: "kale",
    name: "Kale",
    latinName: "Brassica oleracea var. sabellica",
    category: "Brassica",
    family: "Brassica",
    water: "medium",
    sun: "partial",
    color: "#426b3f",
    spacingCm: { inRow: 40, betweenRows: 50 },
    spacingSource: "Starter catalog: common kale spacing estimate.",
    yieldEstimate: {
      amount: 0.8,
      unit: "kg",
      basis: "perPlant",
      range: { low: 0.4, high: 1.2 },
      source: "Starter estimate for repeated leaf harvest.",
    },
    gardenValue: {
      flavorGain: 4,
      marketPrice: 3,
      freshnessImportance: 4,
      availability: 3,
      rarity: 4,
      spaceEfficiency: 3,
      storageValue: 3,
    },
    swissSuitability: "excellent",
    smallGardenSuitability: "good",
    plantingWindow: "April to July",
    harvestWindow: "September to March",
    tags: ["winter", "repeat-harvest", "brassica"],
    companions: ["bean", "chard", "beetroot"],
    avoid: tomatoCropIds,
  },
  {
    id: "leek",
    name: "Leek",
    latinName: "Allium porrum",
    category: "Allium",
    family: "Allium",
    water: "medium",
    sun: "full",
    color: "#6e8f68",
    spacingCm: { inRow: 15, betweenRows: 30 },
    spacingSource: "Starter catalog: common leek spacing estimate.",
    yieldEstimate: {
      amount: 3,
      unit: "kg",
      basis: "perSquareMeter",
      range: { low: 2, high: 4 },
      source: "Starter estimate for medium leeks.",
    },
    gardenValue: {
      flavorGain: 3,
      marketPrice: 3,
      freshnessImportance: 3,
      availability: 2,
      rarity: 3,
      spaceEfficiency: 4,
      storageValue: 4,
    },
    swissSuitability: "excellent",
    smallGardenSuitability: "good",
    plantingWindow: "March to May",
    harvestWindow: "September to March",
    tags: ["allium", "winter", "storage"],
    companions: ["carrot", "cornSalad", "lettuce"],
    avoid: ["bean"],
  },
  {
    id: "onion",
    name: "Onion",
    latinName: "Allium cepa",
    category: "Allium",
    family: "Allium",
    water: "medium",
    sun: "full",
    color: "#c6a358",
    spacingCm: { inRow: 10, betweenRows: 25 },
    spacingSource: "Starter catalog: common onion spacing estimate.",
    yieldEstimate: {
      amount: 3,
      unit: "kg",
      basis: "perSquareMeter",
      range: { low: 2, high: 4 },
      source: "Starter estimate for bulb onions.",
    },
    gardenValue: {
      flavorGain: 2,
      marketPrice: 2,
      freshnessImportance: 2,
      availability: 1,
      rarity: 3,
      spaceEfficiency: 4,
      storageValue: 5,
    },
    swissSuitability: "excellent",
    smallGardenSuitability: "good",
    plantingWindow: "March to April",
    harvestWindow: "July to September",
    tags: ["allium", "storage", "low-practical-value"],
    companions: ["carrot", "beetroot", "lettuce"],
    avoid: ["bean"],
  },
  {
    id: "beetroot",
    name: "Beetroot",
    latinName: "Beta vulgaris subsp. vulgaris",
    category: "Root",
    family: "Amaranth",
    water: "medium",
    sun: "full",
    color: "#8e2f57",
    spacingCm: { inRow: 10, betweenRows: 30 },
    spacingSource: "Starter catalog: common beetroot spacing estimate.",
    yieldEstimate: {
      amount: 3,
      unit: "kg",
      basis: "perSquareMeter",
      range: { low: 2, high: 4 },
      source: "Starter estimate for beet roots.",
    },
    gardenValue: {
      flavorGain: 3,
      marketPrice: 2,
      freshnessImportance: 3,
      availability: 2,
      rarity: 4,
      spaceEfficiency: 4,
      storageValue: 4,
    },
    swissSuitability: "excellent",
    smallGardenSuitability: "good",
    plantingWindow: "April to July",
    harvestWindow: "July to November",
    tags: ["root", "colorful", "storage"],
    companions: ["onion", "kohlrabi", "lettuce"],
    avoid: [],
  },
  {
    id: "parsnip",
    name: "Parsnip",
    latinName: "Pastinaca sativa",
    category: "Root",
    family: "Umbellifer",
    water: "medium",
    sun: "full",
    color: "#d8c999",
    spacingCm: { inRow: 10, betweenRows: 35 },
    spacingSource: "Starter catalog: common parsnip spacing estimate.",
    yieldEstimate: {
      amount: 3,
      unit: "kg",
      basis: "perSquareMeter",
      range: { low: 2, high: 4 },
      source: "Starter estimate for half-long parsnips.",
    },
    gardenValue: {
      flavorGain: 4,
      marketPrice: 3,
      freshnessImportance: 3,
      availability: 4,
      rarity: 4,
      spaceEfficiency: 3,
      storageValue: 5,
    },
    swissSuitability: "excellent",
    smallGardenSuitability: "good",
    plantingWindow: "March to May",
    harvestWindow: "October to March",
    tags: ["root", "winter", "storage", "rare"],
    companions: ["onion", "lettuce", "radish"],
    avoid: [],
  },
  {
    id: "broccoli",
    name: "Broccoli",
    latinName: "Brassica oleracea var. italica",
    category: "Brassica",
    family: "Brassica",
    water: "high",
    sun: "full",
    color: "#3f6f45",
    spacingCm: { inRow: 45, betweenRows: 60 },
    spacingSource: "Starter catalog: common broccoli spacing estimate.",
    yieldEstimate: {
      amount: 1,
      unit: "pieces",
      basis: "perPlant",
      source: "Starter estimate for one main head plus side shoots.",
    },
    gardenValue: {
      flavorGain: 3,
      marketPrice: 3,
      freshnessImportance: 3,
      availability: 2,
      rarity: 3,
      spaceEfficiency: 2,
      storageValue: 2,
    },
    swissSuitability: "good",
    smallGardenSuitability: "poor",
    plantingWindow: "March to July",
    harvestWindow: "June to November",
    tags: ["brassica", "space-hungry"],
    companions: ["bean", "beetroot"],
    avoid: tomatoCropIds,
  },
  {
    id: "fennel",
    name: "Fennel",
    latinName: "Foeniculum vulgare var. azoricum",
    category: "Umbellifer",
    family: "Umbellifer",
    water: "medium",
    sun: "full",
    color: "#9ab36b",
    spacingCm: { inRow: 25, betweenRows: 35 },
    spacingSource: "Starter catalog: common bulb fennel spacing estimate.",
    yieldEstimate: {
      amount: 1,
      unit: "pieces",
      basis: "perPlant",
      source: "Starter estimate for one bulb per plant.",
    },
    gardenValue: {
      flavorGain: 4,
      marketPrice: 3,
      freshnessImportance: 4,
      availability: 3,
      rarity: 4,
      spaceEfficiency: 3,
      storageValue: 2,
    },
    swissSuitability: "good",
    smallGardenSuitability: "good",
    plantingWindow: "May to July",
    harvestWindow: "August to October",
    tags: ["aromatic", "specialty", "autumn"],
    companions: ["lettuce"],
    avoid: ["bean", ...tomatoCropIds],
  },
  {
    id: "eggplant",
    name: "Eggplant",
    latinName: "Solanum melongena",
    category: "Fruit vegetable",
    family: "Nightshade",
    water: "high",
    sun: "full",
    color: "#6f4f8f",
    spacingCm: { inRow: 50, betweenRows: 60 },
    spacingSource: "Starter catalog: compact eggplant spacing estimate.",
    yieldEstimate: {
      amount: 5,
      unit: "pieces",
      basis: "perPlant",
      range: { low: 3, high: 8 },
      source: "Starter estimate for warm protected garden conditions.",
    },
    gardenValue: {
      flavorGain: 4,
      marketPrice: 4,
      freshnessImportance: 4,
      availability: 3,
      rarity: 5,
      spaceEfficiency: 3,
      storageValue: 1,
    },
    swissSuitability: "possible",
    smallGardenSuitability: "good",
    plantingWindow: "Transplant after frost, usually May",
    harvestWindow: "July to October",
    tags: ["warm-season", "rare", "needs-warmth"],
    companions: ["basil", "bean"],
    avoid: ["potato"],
  },
  {
    id: "pepper",
    name: "Pepper",
    latinName: "Capsicum annuum",
    category: "Fruit vegetable",
    family: "Nightshade",
    water: "medium",
    sun: "full",
    color: "#d95036",
    spacingCm: { inRow: 40, betweenRows: 50 },
    spacingSource: "Starter catalog: sweet/chili pepper spacing estimate.",
    yieldEstimate: {
      amount: 8,
      unit: "pieces",
      basis: "perPlant",
      range: { low: 4, high: 15 },
      source: "Starter estimate for sweet pepper or chili plants.",
    },
    gardenValue: {
      flavorGain: 4,
      marketPrice: 4,
      freshnessImportance: 4,
      availability: 3,
      rarity: 5,
      spaceEfficiency: 4,
      storageValue: 2,
    },
    swissSuitability: "good",
    smallGardenSuitability: "excellent",
    plantingWindow: "Transplant after frost, usually May",
    harvestWindow: "July to October",
    tags: ["warm-season", "rare", "high-value"],
    companions: ["basil", "carrot", "parsley"],
    avoid: ["potato"],
  },
  {
    id: "winterSquash",
    name: "Winter squash",
    latinName: "Cucurbita maxima",
    category: "Cucurbit",
    family: "Cucurbit",
    water: "high",
    sun: "full",
    color: "#d68134",
    spacingCm: { inRow: 90, betweenRows: 120 },
    spacingSource: "Starter catalog: compact winter squash spacing estimate.",
    yieldEstimate: {
      amount: 3,
      unit: "pieces",
      basis: "perPlant",
      range: { low: 1, high: 5 },
      source: "Starter estimate for small squash or Hokkaido-type plants.",
    },
    gardenValue: {
      flavorGain: 3,
      marketPrice: 3,
      freshnessImportance: 2,
      availability: 3,
      rarity: 4,
      spaceEfficiency: 1,
      storageValue: 5,
    },
    swissSuitability: "good",
    smallGardenSuitability: "poor",
    plantingWindow: "May to June",
    harvestWindow: "September to October",
    tags: ["storage", "space-hungry", "cucurbit"],
    companions: ["bean", "radish"],
    avoid: [],
  },
];

export const cropById = Object.fromEntries(crops.map((crop) => [crop.id, crop])) as Record<CropId, Crop>;

export function getCropCategories(catalog: Crop[] = crops) {
  return [...new Set(catalog.map((crop) => crop.category))].sort((left, right) => left.localeCompare(right));
}

function cropMatchesSeason(crop: Crop, season: CropSeasonFilter) {
  if (season === "all") return true;

  const seasonMonths: Record<Exclude<CropSeasonFilter, "all">, string[]> = {
    spring: ["march", "april", "may"],
    summer: ["june", "july", "august"],
    autumn: ["september", "october", "november"],
  };
  const plantingWindow = crop.plantingWindow.toLowerCase();

  return seasonMonths[season].some((month) => plantingWindow.includes(month));
}

export function filterCrops(catalog: Crop[], selectedCropIds: Set<CropId>, filters: CropCatalogFilters) {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return catalog
    .filter((crop) => !selectedCropIds.has(crop.id))
    .filter((crop) => crop.smallGardenSuitability !== "poor")
    .filter((crop) => filters.category === "all" || crop.category === filters.category)
    .filter((crop) => filters.sun === "all" || crop.sun === filters.sun)
    .filter((crop) => filters.water === "all" || crop.water === filters.water)
    .filter((crop) => filters.suitability === "all" || crop.smallGardenSuitability === filters.suitability)
    .filter((crop) => cropMatchesSeason(crop, filters.season))
    .filter((crop) => !filters.highValueOnly || calculateGardenValueScore(crop) >= 70)
    .filter((crop) => {
      if (!normalizedSearch) return true;

      return [
        crop.name,
        crop.latinName,
        crop.category,
        crop.family,
        crop.water,
        crop.sun,
        crop.smallGardenSuitability,
        crop.swissSuitability,
        crop.plantingWindow,
        crop.harvestWindow,
        crop.spacingSource,
        crop.yieldEstimate.source,
        ...crop.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    })
    .sort((left, right) => calculateGardenValueScore(right) - calculateGardenValueScore(left));
}

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
