"use server";

import { createClient } from "@/lib/supabase/server";
import { getPrimaryHousehold } from "@/lib/household";
import { revalidatePath } from "next/cache";

export type IngredientInput = {
  amount: number | null;
  unit: string;
  name: string;
  notes: string;
  /** kcal for this ingredient line in the full recipe */
  calories_kcal?: number | null;
};

export async function saveRecipeAction(input: {
  id?: string;
  title: string;
  instructions: string;
  servings: number;
  ingredients: IngredientInput[];
  source_url?: string | null;
}) {
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) throw new Error("No household");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const title = input.title.trim();
  if (!title) throw new Error("Title is required");
  const servings = input.servings > 0 ? input.servings : 1;
  const sourceUrl =
    input.source_url != null && input.source_url.trim() !== ""
      ? input.source_url.trim()
      : null;

  let recipeId = input.id;

  if (recipeId) {
    const { error: upErr } = await supabase
      .from("recipes")
      .update({
        title,
        instructions: input.instructions,
        servings,
        source_url: sourceUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipeId)
      .eq("household_id", ctx.household.id);
    if (upErr) throw new Error(upErr.message);
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
  } else {
    const { data: created, error: insErr } = await supabase
      .from("recipes")
      .insert({
        household_id: ctx.household.id,
        title,
        instructions: input.instructions,
        servings,
        source_url: sourceUrl,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    recipeId = created.id;
  }

  const rows = input.ingredients
    .filter((i) => i.name.trim().length > 0)
    .map((i, idx) => ({
      recipe_id: recipeId!,
      sort_order: idx,
      amount: i.amount,
      unit: i.unit.trim(),
      name: i.name.trim(),
      notes: i.notes.trim() || null,
      calories_kcal:
        i.calories_kcal != null &&
        Number.isFinite(i.calories_kcal) &&
        i.calories_kcal >= 0
          ? i.calories_kcal
          : null,
    }));

  if (rows.length) {
    const { error: ingErr } = await supabase.from("recipe_ingredients").insert(rows);
    if (ingErr) throw new Error(ingErr.message);
  }

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/plan");
  return recipeId!;
}

export async function deleteRecipeAction(recipeId: string) {
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) throw new Error("No household");

  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", recipeId)
    .eq("household_id", ctx.household.id);

  if (error) throw new Error(error.message);
  revalidatePath("/recipes");
  revalidatePath("/plan");
}
