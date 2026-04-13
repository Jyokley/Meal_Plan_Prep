"use server";

import { estimateGrams } from "@/lib/nutrition/grams";
import {
  fetchFoodKcalPer100g,
  getUsdaApiKey,
  searchFoodFdcId,
} from "@/lib/nutrition/usda-fdc";

export type EstimateLineResult =
  | {
      ok: true;
      kcal: number;
      matchedFood: string;
      note?: string;
    }
  | { ok: false; message: string };

async function estimateOneLine(
  apiKey: string,
  name: string,
  amount: number | null,
  unit: string,
): Promise<EstimateLineResult> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, message: "Ingredient name is required." };
  }

  const { grams, note: gramNote } = estimateGrams(amount, unit);
  if (grams == null) {
    return {
      ok: false,
      message: gramNote ?? "Could not estimate grams for this amount and unit.",
    };
  }

  let match: { fdcId: number; description: string } | null;
  try {
    match = await searchFoodFdcId(apiKey, trimmed);
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "USDA search failed.",
    };
  }

  if (!match) {
    return {
      ok: false,
      message: `No USDA match for “${trimmed}”. Try a simpler name (e.g. “oats rolled dry”).`,
    };
  }

  let kcalPer100g: number | null;
  try {
    kcalPer100g = await fetchFoodKcalPer100g(apiKey, match.fdcId);
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "USDA food lookup failed.",
    };
  }

  if (kcalPer100g == null) {
    return {
      ok: false,
      message: `No calorie data for USDA match “${match.description}”.`,
    };
  }

  const lineKcal = (kcalPer100g * grams) / 100;
  const rounded = Math.max(0, Math.round(lineKcal * 10) / 10);

  const note =
    gramNote && gramNote.length > 0
      ? `${gramNote} Match: ${match.description}.`
      : `Match: ${match.description}.`;

  return { ok: true, kcal: rounded, matchedFood: match.description, note };
}

export async function estimateIngredientCaloriesAction(input: {
  name: string;
  amount: number | null;
  unit: string;
}): Promise<EstimateLineResult> {
  const apiKey = getUsdaApiKey();
  if (!apiKey) {
    return {
      ok: false,
      message:
        "Set USDA_FDC_API_KEY in .env.local (or Vercel env). Get a free key at https://fdc.nal.usda.gov/api-key-signup.html",
    };
  }
  return estimateOneLine(apiKey, input.name, input.amount, input.unit);
}

export async function estimateRecipeIngredientRowsAction(
  rows: { name: string; amount: number | null; unit: string }[],
): Promise<{ results: EstimateLineResult[] }> {
  const apiKey = getUsdaApiKey();
  if (!apiKey) {
    const message =
      "Set USDA_FDC_API_KEY. Sign up: https://fdc.nal.usda.gov/api-key-signup.html";
    return {
      results: rows.map(() => ({ ok: false as const, message })),
    };
  }

  const results: EstimateLineResult[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.name.trim()) {
      results.push({ ok: false, message: "Empty row skipped." });
      continue;
    }
    results.push(await estimateOneLine(apiKey, row.name, row.amount, row.unit));
    if (i < rows.length - 1) {
      await new Promise((r) => setTimeout(r, 120));
    }
  }
  return { results };
}
