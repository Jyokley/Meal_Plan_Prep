"use server";

import { createClient } from "@/lib/supabase/server";
import { getPrimaryHousehold } from "@/lib/household";
import type { MealSlot } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function addPlannedMealAction(input: {
  planDate: string;
  mealSlot: MealSlot;
  recipeId: string;
  servingsMultiplier: number;
}) {
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) throw new Error("No household");

  const mult =
    input.servingsMultiplier > 0 ? input.servingsMultiplier : 1;

  const { error } = await supabase.from("planned_meals").insert({
    household_id: ctx.household.id,
    plan_date: input.planDate,
    meal_slot: input.mealSlot,
    recipe_id: input.recipeId,
    servings_multiplier: mult,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/plan");
}

export async function addPlannedMealsBatchAction(input: {
  planDates: string[];
  mealSlot: MealSlot;
  recipeId: string;
  servingsMultiplier: number;
}) {
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) throw new Error("No household");

  const mult =
    input.servingsMultiplier > 0 ? input.servingsMultiplier : 1;
  const uniqueDates = [...new Set(input.planDates)].filter(Boolean);
  if (uniqueDates.length === 0) throw new Error("Select at least one day");

  const rows = uniqueDates.map((planDate) => ({
    household_id: ctx.household.id,
    plan_date: planDate,
    meal_slot: input.mealSlot,
    recipe_id: input.recipeId,
    servings_multiplier: mult,
  }));

  const { error } = await supabase.from("planned_meals").insert(rows);

  if (error) throw new Error(error.message);
  revalidatePath("/plan");
}

/** Replaces all meals in the calendar week after `sourceWeekMondayIso` with copies (+7 days). */
export async function copyMealPlanToNextWeekAction(
  sourceWeekMondayIso: string,
): Promise<{ copied: number }> {
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) throw new Error("No household");

  const { data, error } = await supabase.rpc("copy_planned_meals_to_next_week", {
    p_household_id: ctx.household.id,
    p_source_week_monday: sourceWeekMondayIso,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/plan");
  const n = typeof data === "number" ? data : Number(data);
  return { copied: Number.isFinite(n) ? n : 0 };
}

export async function deletePlannedMealAction(id: string) {
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) throw new Error("No household");

  const { error } = await supabase
    .from("planned_meals")
    .delete()
    .eq("id", id)
    .eq("household_id", ctx.household.id);

  if (error) throw new Error(error.message);
  revalidatePath("/plan");
}
