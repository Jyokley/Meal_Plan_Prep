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
