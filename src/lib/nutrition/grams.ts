/**
 * Rough mass in grams for cooking units (water density where volume).
 * For accuracy, prefer weighing in grams.
 */
export function estimateGrams(
  amount: number | null,
  unitRaw: string,
): { grams: number | null; note?: string } {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) {
    return { grams: null, note: "Enter a positive amount." };
  }

  const u = unitRaw.trim().toLowerCase();
  const normalized = u.replace(/\./g, "").replace(/s$/, "");

  if (normalized === "") {
    return { grams: null, note: "Add a unit (g, oz, cup, …)." };
  }

  if (normalized === "g" || normalized === "gram" || normalized === "gm") {
    return { grams: amount };
  }

  if (normalized === "kg" || normalized === "kilogram") {
    return { grams: amount * 1000 };
  }

  if (
    normalized === "oz" ||
    normalized === "ounce" ||
    normalized === "fl oz" ||
    normalized === "floz"
  ) {
    return { grams: amount * 28.3495 };
  }

  if (normalized === "lb" || normalized === "pound") {
    return { grams: amount * 453.592 };
  }

  if (normalized === "ml" || normalized === "milliliter" || normalized === "cc") {
    return { grams: amount, note: "Treated as water density (1 ml ≈ 1 g)." };
  }

  if (normalized === "l" || normalized === "liter" || normalized === "litre") {
    return { grams: amount * 1000, note: "Treated as water density." };
  }

  if (normalized === "cup" || normalized === "c") {
    return {
      grams: amount * 236.588,
      note: "Cup volume assumed as water equivalent; dense foods differ.",
    };
  }

  if (normalized === "tbsp" || normalized === "tablespoon" || normalized === "tbs") {
    return {
      grams: amount * 14.7868,
      note: "Tablespoon volume as water equivalent.",
    };
  }

  if (normalized === "tsp" || normalized === "teaspoon") {
    return {
      grams: amount * 4.92892,
      note: "Teaspoon volume as water equivalent.",
    };
  }

  return {
    grams: null,
    note: `Unknown unit "${unitRaw.trim()}". Try g, oz, lb, ml, cup, tbsp, tsp.`,
  };
}
