"use server";

import { createClient } from "@/lib/supabase/server";
import { getPrimaryHousehold } from "@/lib/household";
import { revalidatePath } from "next/cache";

function mergeKey(name: string, unit: string) {
  return `${name.trim().toLowerCase()}||${unit.trim().toLowerCase()}`;
}

/** Ingredient amounts are for the full recipe yield; scale by portions needed vs that yield. */
function ingredientScaleFactor(
  plannedPortions: number,
  recipeYieldServings: number,
): number {
  const portions = plannedPortions > 0 ? plannedPortions : 1;
  const yieldServings =
    Number.isFinite(recipeYieldServings) && recipeYieldServings > 0
      ? recipeYieldServings
      : 1;
  return portions / yieldServings;
}

/** Snap float noise (e.g. 0.999999 → 1) and cap fractional precision for grocery amounts. */
function tidyAmountForGroceries(n: number): number {
  if (!Number.isFinite(n)) return n;
  if (n === 0) return 0;

  const snapInteger = (x: number) => {
    const nearest = Math.round(x);
    const diff = Math.abs(x - nearest);
    const tol = Math.max(1e-5, 1e-9 * Math.max(1, Math.abs(x)));
    return diff <= tol ? nearest : x;
  };

  let x = snapInteger(n);
  x = Math.round(x * 10000) / 10000;
  x = snapInteger(x);
  return Object.is(x, -0) ? 0 : x;
}

export async function createEmptyListAction(name: string) {
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) throw new Error("No household");

  const { data, error } = await supabase
    .from("shopping_lists")
    .insert({
      household_id: ctx.household.id,
      name: name.trim() || "Shopping list",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/lists");
  return data.id as string;
}

export async function generateShoppingListAction(input: {
  name: string;
  startDate: string;
  endDate: string;
}) {
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) throw new Error("No household");

  const { data: planned, error: pErr } = await supabase
    .from("planned_meals")
    .select("recipe_id, servings_multiplier")
    .eq("household_id", ctx.household.id)
    .gte("plan_date", input.startDate)
    .lte("plan_date", input.endDate);

  if (pErr) throw new Error(pErr.message);

  const recipeIds = [...new Set((planned ?? []).map((p) => p.recipe_id))];
  if (recipeIds.length === 0) {
    throw new Error("No planned meals in that date range");
  }

  const { data: recipes, error: rErr } = await supabase
    .from("recipes")
    .select("id, servings")
    .in("id", recipeIds)
    .eq("household_id", ctx.household.id);

  if (rErr) throw new Error(rErr.message);
  const recipeMap = new Map((recipes ?? []).map((r) => [r.id, r]));

  const { data: ings, error: iErr } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id, amount, unit, name, notes")
    .in("recipe_id", recipeIds)
    .order("sort_order", { ascending: true });

  if (iErr) throw new Error(iErr.message);

  const byRecipe = new Map<string, typeof ings>();
  for (const row of ings ?? []) {
    const list = byRecipe.get(row.recipe_id) ?? [];
    list.push(row);
    byRecipe.set(row.recipe_id, list);
  }

  const merged = new Map<
    string,
    { name: string; unit: string; amount: number; notes: string[] }
  >();

  for (const pm of planned ?? []) {
    const recipe = recipeMap.get(pm.recipe_id);
    if (!recipe) continue;
    const factor = ingredientScaleFactor(
      Number(pm.servings_multiplier),
      Number(recipe.servings),
    );
    const ingRows = byRecipe.get(pm.recipe_id) ?? [];
    for (const ing of ingRows) {
      const raw = ing.amount != null ? Number(ing.amount) * factor : null;
      const unit = (ing.unit ?? "").trim();
      const name = (ing.name ?? "").trim();
      if (!name) continue;
      const key = mergeKey(name, unit);
      const prev = merged.get(key);
      const amt = raw ?? 0;
      if (prev) {
        merged.set(key, {
          ...prev,
          amount: prev.amount + amt,
          notes: ing.notes ? [...prev.notes, ing.notes] : prev.notes,
        });
      } else {
        merged.set(key, {
          name,
          unit,
          amount: amt,
          notes: ing.notes ? [ing.notes] : [],
        });
      }
    }
  }

  const { data: listRow, error: lErr } = await supabase
    .from("shopping_lists")
    .insert({
      household_id: ctx.household.id,
      name: input.name.trim() || `Groceries ${input.startDate} – ${input.endDate}`,
      generated_from_start: input.startDate,
      generated_from_end: input.endDate,
    })
    .select("id")
    .single();

  if (lErr) throw new Error(lErr.message);

  const items = [...merged.values()].map((m, idx) => {
    const amount =
      m.amount > 0 ? tidyAmountForGroceries(m.amount) : 0;
    const parts: string[] = [];
    if (amount > 0) parts.push(String(amount));
    if (m.unit) parts.push(m.unit);
    parts.push(m.name);
    const display = parts.join(" ");
    return {
      list_id: listRow.id,
      display_text: display,
      amount: amount > 0 ? amount : null,
      unit: m.unit,
      name: m.name,
      checked: false,
      sort_order: idx,
      category: null as string | null,
    };
  });

  if (items.length) {
    const { error: itemErr } = await supabase
      .from("shopping_list_items")
      .insert(items);
    if (itemErr) throw new Error(itemErr.message);
  }

  revalidatePath("/lists");
  return listRow.id as string;
}

export async function toggleListItemAction(
  itemId: string,
  checked: boolean,
  listId: string,
) {
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) throw new Error("No household");

  const { error } = await supabase
    .from("shopping_list_items")
    .update({ checked })
    .eq("id", itemId);

  if (error) throw new Error(error.message);
  revalidatePath("/lists");
  revalidatePath(`/lists/${listId}`);
}

export async function addListItemAction(listId: string, name: string, unit?: string) {
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) throw new Error("No household");

  const { data: list, error: lErr } = await supabase
    .from("shopping_lists")
    .select("id")
    .eq("id", listId)
    .eq("household_id", ctx.household.id)
    .single();

  if (lErr || !list) throw new Error("List not found");

  const { count } = await supabase
    .from("shopping_list_items")
    .select("*", { count: "exact", head: true })
    .eq("list_id", listId);

  const { error } = await supabase.from("shopping_list_items").insert({
    list_id: listId,
    name: name.trim(),
    unit: (unit ?? "").trim(),
    display_text: name.trim(),
    checked: false,
    sort_order: (count ?? 0) + 1,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/lists");
  revalidatePath(`/lists/${listId}`);
}

export async function deleteShoppingListAction(listId: string) {
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) throw new Error("No household");

  const { error } = await supabase
    .from("shopping_lists")
    .delete()
    .eq("id", listId)
    .eq("household_id", ctx.household.id);

  if (error) throw new Error(error.message);
  revalidatePath("/lists");
}
