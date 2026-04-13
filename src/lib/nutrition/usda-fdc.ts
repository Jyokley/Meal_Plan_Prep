const FDC_BASE = "https://api.nal.usda.gov/fdc/v1";

/** Prefer these data types so nutrient amounts are usually per 100 g edible portion. */
const SEARCH_DATA_TYPES = [
  "Foundation",
  "SR Legacy",
  "Survey (FNDDS)",
] as const;

type FoodNutrient = {
  amount?: number;
  nutrient?: {
    id?: number;
    name?: string;
    unitName?: string;
  };
};

function extractKcalPer100g(food: { foodNutrients?: FoodNutrient[] }): number | null {
  const list = food.foodNutrients ?? [];
  const byId = [1008, 2047, 2048];
  for (const id of byId) {
    const hit = list.find((x) => x.nutrient?.id === id && x.amount != null);
    if (hit?.amount != null && Number.isFinite(hit.amount) && hit.amount >= 0) {
      return hit.amount;
    }
  }
  for (const x of list) {
    const name = (x.nutrient?.name ?? "").toLowerCase();
    const unit = (x.nutrient?.unitName ?? "").toUpperCase();
    if (
      (name.includes("energy") || name.includes("calorie")) &&
      (unit === "KCAL" || unit === "CAL") &&
      x.amount != null &&
      Number.isFinite(x.amount) &&
      x.amount >= 0
    ) {
      return x.amount;
    }
  }
  return null;
}

export async function searchFoodFdcId(
  apiKey: string,
  query: string,
): Promise<{ fdcId: number; description: string } | null> {
  const q = query.trim();
  if (!q) return null;

  const url = `${FDC_BASE}/foods/search?api_key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: q,
      pageSize: 5,
      dataType: [...SEARCH_DATA_TYPES],
    }),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`USDA search failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    foods?: { fdcId: number; description?: string }[];
  };
  const first = data.foods?.[0];
  if (!first?.fdcId) return null;
  return {
    fdcId: first.fdcId,
    description: first.description ?? "Unknown food",
  };
}

export async function fetchFoodKcalPer100g(
  apiKey: string,
  fdcId: number,
): Promise<number | null> {
  const url = `${FDC_BASE}/food/${fdcId}?api_key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`USDA food detail failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const food = (await res.json()) as { foodNutrients?: FoodNutrient[] };
  return extractKcalPer100g(food);
}

export function getUsdaApiKey(): string | null {
  const k = process.env.USDA_FDC_API_KEY?.trim();
  return k && k.length > 0 ? k : null;
}
