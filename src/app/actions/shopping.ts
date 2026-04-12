"use server";

import { createClient } from "@/lib/supabase/server";
import { getPrimaryHousehold } from "@/lib/household";
import { revalidatePath } from "next/cache";

function mergeKey(name: string, unit: string) {
  return `${name.trim().toLowerCase()}||${unit.trim().toLowerCase()}`;
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
    if (!recipeMap.has(pm.recipe_id)) continue;
    const factor = Number(pm.servings_multiplier) || 1;
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
    const parts: string[] = [];
    if (m.amount > 0) parts.push(String(m.amount));
    if (m.unit) parts.push(m.unit);
    parts.push(m.name);
    const display = parts.join(" ");
    return {
      list_id: listRow.id,
      display_text: display,
      amount: m.amount > 0 ? m.amount : null,
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
