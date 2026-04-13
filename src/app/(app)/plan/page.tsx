import { createClient } from "@/lib/supabase/server";
import { addDays, startOfWeekMonday, toISODate } from "@/lib/dates";
import { getPrimaryHousehold } from "@/lib/household";
import type { MealSlot } from "@/types/database";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MealPlanBoard, type PlannedMealItem } from "./meal-plan-board";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) redirect("/onboarding");

  const weekStart = sp.week
    ? new Date(sp.week + "T12:00:00")
    : startOfWeekMonday(new Date());
  const monday = startOfWeekMonday(weekStart);
  const weekEnd = addDays(monday, 6);
  const prevWeek = addDays(monday, -7);
  const nextWeek = addDays(monday, 7);

  const startStr = toISODate(monday);
  const endStr = toISODate(weekEnd);

  const { data: plannedRaw } = await supabase
    .from("planned_meals")
    .select("id, plan_date, meal_slot, servings_multiplier, recipe_id, recipes(title)")
    .eq("household_id", ctx.household.id)
    .gte("plan_date", startStr)
    .lte("plan_date", endStr)
    .order("plan_date", { ascending: true });

  const planned = plannedRaw ?? [];

  const { data: recipeOptions } = await supabase
    .from("recipes")
    .select("id, title")
    .eq("household_id", ctx.household.id)
    .order("title", { ascending: true });

  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const weekDayIsos = days.map((d) => toISODate(d));
  const dayLabels = days.map((d) =>
    d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
  );

  const plannedItems: PlannedMealItem[] = planned.map((row) => {
    const r = row.recipes as unknown as { title: string } | null;
    return {
      id: row.id,
      plan_date: row.plan_date,
      meal_slot: row.meal_slot as MealSlot,
      servings_multiplier: row.servings_multiplier,
      recipe_title: r?.title ?? "Recipe",
    };
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      {(recipeOptions ?? []).length === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Add a{" "}
          <Link href="/recipes/new" className="font-medium underline">
            recipe
          </Link>{" "}
          before you can plan meals.
        </p>
      ) : null}

      <MealPlanBoard
        weekLabelStart={startStr}
        weekLabelEnd={endStr}
        weekDayIsos={weekDayIsos}
        dayLabels={dayLabels}
        planned={plannedItems}
        recipes={recipeOptions ?? []}
        prevWeekHref={`/plan?week=${toISODate(prevWeek)}`}
        nextWeekHref={`/plan?week=${toISODate(nextWeek)}`}
      />
    </div>
  );
}
