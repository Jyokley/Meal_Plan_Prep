/**
 * Parse Schema.org Recipe objects from HTML (JSON-LD in script tags).
 * No network calls — used by server action after fetch.
 */

export type ImportedRecipeDraft = {
  title: string;
  instructions: string;
  servings: number;
  ingredients: { amount: number | null; unit: string; name: string }[];
  sourceUrl: string;
};

function asArray<T>(x: T | T[] | undefined | null): T[] {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

function isRecipeType(t: unknown): boolean {
  return asArray(t).some((x) => {
    const s = String(x).toLowerCase();
    return s === "recipe" || s.endsWith("/recipe");
  });
}

function collectJsonLdNodes(value: unknown, out: Record<string, unknown>[]): void {
  if (value == null) return;
  if (Array.isArray(value)) {
    for (const x of value) collectJsonLdNodes(x, out);
    return;
  }
  if (typeof value !== "object") return;
  const o = value as Record<string, unknown>;
  if ("@graph" in o && o["@graph"] != null) {
    for (const g of asArray(o["@graph"])) collectJsonLdNodes(g, out);
    return;
  }
  if (isRecipeType(o["@type"])) {
    out.push(o);
    return;
  }
  if ("mainEntity" in o) collectJsonLdNodes(o["mainEntity"], out);
}

function parseJsonLdScripts(html: string): unknown[] {
  const roots: unknown[] = [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    try {
      roots.push(JSON.parse(raw));
    } catch {
      // Some pages concatenate invalid JSON; skip chunk
    }
  }
  return roots;
}

function findAllRecipes(roots: unknown[]): Record<string, unknown>[] {
  const recipes: Record<string, unknown>[] = [];
  for (const root of roots) collectJsonLdNodes(root, recipes);
  return recipes;
}

function pickRecipe(recipes: Record<string, unknown>[]): Record<string, unknown> | null {
  if (recipes.length === 0) return null;
  if (recipes.length === 1) return recipes[0]!;
  return recipes.reduce((best, cur) => {
    const bn = ingredientStringsFromField(best["recipeIngredient"]).length;
    const cn = ingredientStringsFromField(cur["recipeIngredient"]).length;
    if (cn > bn) return cur;
    if (cn < bn) return best;
    const bt = String(best["name"] ?? "").length;
    const ct = String(cur["name"] ?? "").length;
    return ct > bt ? cur : best;
  });
}

function recipeName(recipe: Record<string, unknown>): string {
  const n = recipe["name"];
  if (typeof n === "string" && n.trim()) return n.trim();
  if (Array.isArray(n)) {
    const s = n.find((x) => typeof x === "string") as string | undefined;
    if (s?.trim()) return s.trim();
  }
  return "";
}

function normalizeInstructions(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    const lines: string[] = [];
    for (const item of value) {
      if (typeof item === "string") {
        if (item.trim()) lines.push(item.trim());
      } else if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        if (typeof o.text === "string" && o.text.trim()) {
          lines.push(o.text.trim());
        } else if (typeof o.name === "string" && o.name.trim()) {
          lines.push(o.name.trim());
        } else if (o.itemListElement != null) {
          const nested = normalizeInstructions(o.itemListElement);
          if (nested) lines.push(nested);
        }
      }
    }
    return lines.join("\n\n").trim();
  }
  if (typeof value === "object" && value !== null && "text" in value) {
    const t = (value as { text?: unknown }).text;
    return typeof t === "string" ? t.trim() : "";
  }
  return "";
}

function ingredientStringsFromField(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      if (item.trim()) out.push(item.trim());
    } else if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      if (typeof o.name === "string" && o.name.trim()) out.push(o.name.trim());
    }
  }
  return out;
}

const COMMON_UNITS = new Set([
  "cup",
  "cups",
  "c",
  "tbsp",
  "tablespoon",
  "tablespoons",
  "tbs",
  "tsp",
  "teaspoon",
  "teaspoons",
  "ts",
  "g",
  "gram",
  "grams",
  "kg",
  "mg",
  "ml",
  "l",
  "liter",
  "litre",
  "liters",
  "litres",
  "oz",
  "ounce",
  "ounces",
  "fl",
  "lb",
  "lbs",
  "pound",
  "pounds",
  "clove",
  "cloves",
  "slice",
  "slices",
  "piece",
  "pieces",
  "stalk",
  "stalks",
  "sprig",
  "sprigs",
  "can",
  "cans",
  "package",
  "pkg",
  "stick",
  "sticks",
  "large",
  "medium",
  "small",
  "pinch",
  "dash",
  "handful",
]);

function parseUnicodeFractions(s: string): string {
  return s
    .replace(/½/g, "1/2")
    .replace(/⅓/g, "1/3")
    .replace(/⅔/g, "2/3")
    .replace(/¼/g, "1/4")
    .replace(/¾/g, "3/4")
    .replace(/⅛/g, "1/8")
    .replace(/⅜/g, "3/8")
    .replace(/⅝/g, "5/8")
    .replace(/⅞/g, "7/8");
}

function parseAmountToken(token: string): number | null {
  const norm = parseUnicodeFractions(token).trim();
  if (!norm) return null;
  const parts = norm.split(/\s+/);
  let sum = 0;
  let any = false;
  for (const p of parts) {
    if (p.includes("/")) {
      const [a, b] = p.split("/").map((x) => Number.parseFloat(x.trim()));
      if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) {
        sum += a! / b!;
        any = true;
      }
    } else {
      const n = Number.parseFloat(p.replace(",", "."));
      if (Number.isFinite(n)) {
        sum += n;
        any = true;
      }
    }
  }
  if (!any || sum <= 0) return null;
  return sum;
}

/** Best-effort split of a typical English ingredient line into amount / unit / name. */
export function parseIngredientLine(raw: string): {
  amount: number | null;
  unit: string;
  name: string;
} {
  const s = raw.trim().replace(/\s+/g, " ");
  if (!s) return { amount: null, unit: "", name: "" };

  const qtyRe =
    /^((?:\d+\s+)?\d+(?:\/\d+)?(?:\s+\d+(?:\/\d+)?)*|[\d.,]+)\s+/;
  const unicodeQtyRe =
    /^((?:\d+\s+)?[\d./\s]+|[\d.,½¼¾⅓⅔⅛⅜⅝⅞]+)\s+/;
  let rest = s;
  let amount: number | null = null;

  const m1 = s.match(unicodeQtyRe);
  if (m1?.[1]) {
    amount = parseAmountToken(m1[1]);
    if (amount != null) rest = s.slice(m1[0].length).trim();
  }

  if (amount == null) {
    const m2 = s.match(qtyRe);
    if (m2?.[1]) {
      amount = parseAmountToken(m2[1]);
      if (amount != null) rest = s.slice(m2[0].length).trim();
    }
  }

  if (!rest) {
    return { amount, unit: "", name: s };
  }

  const first = rest.split(/\s+/)[0];
  const firstLower = first?.toLowerCase().replace(/[,.)]+$/, "") ?? "";

  if (firstLower && COMMON_UNITS.has(firstLower)) {
    const sp = rest.indexOf(" ");
    const unit = sp === -1 ? rest : rest.slice(0, sp);
    const name = sp === -1 ? "" : rest.slice(sp + 1).trim();
    return { amount, unit, name: name || rest };
  }

  return { amount, unit: "", name: rest };
}

function parseYieldServings(yieldVal: unknown): number | null {
  if (yieldVal == null) return null;
  if (typeof yieldVal === "number" && Number.isFinite(yieldVal) && yieldVal > 0) {
    return Math.round(yieldVal);
  }
  const s = String(yieldVal).trim();
  if (!s) return null;
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!m?.[1]) return null;
  const n = Number.parseFloat(m[1].replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(1, Math.round(n));
}

/**
 * Returns a draft if at least one of title, instructions, or ingredients is present.
 */
export function extractRecipeDraftFromHtml(
  html: string,
  sourceUrl: string,
): ImportedRecipeDraft | null {
  const roots = parseJsonLdScripts(html);
  const recipe = pickRecipe(findAllRecipes(roots));
  if (!recipe) return null;

  let title = recipeName(recipe);
  const instructions = normalizeInstructions(recipe["recipeInstructions"]);
  const ingStrings = ingredientStringsFromField(recipe["recipeIngredient"]);
  const ingredients = ingStrings.map((line) => parseIngredientLine(line));

  if (!title && !instructions && ingredients.length === 0) return null;
  if (!title) title = "Imported recipe";

  const servings =
    parseYieldServings(recipe["recipeYield"]) ??
    parseYieldServings(recipe["yield"]) ??
    4;

  return {
    title,
    instructions,
    servings,
    ingredients,
    sourceUrl,
  };
}
