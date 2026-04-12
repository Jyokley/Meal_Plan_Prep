import { createClient } from "@/lib/supabase/server";
import { addDays, startOfWeekMonday, toISODate } from "@/lib/dates";
import { getPrimaryHousehold } from "@/lib/household";
import type { MealSlot } from "@/types/database";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AddMealForm } from "./add-meal-form";
import { DeletePlannedMealButton } from "./delete-planned-meal-button";

const slots: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

const slotLabel: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

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

  const byDateSlot = new Map<string, (typeof planned)[number][]>();
  for (const row of planned) {
    const key = `${row.plan_date}|${row.meal_slot}`;
    const list = byDateSlot.get(key) ?? [];
    list.push(row);
    byDateSlot.set(key, list);
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Meal plan
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Week of {startStr} – {endStr}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/plan?week=${toISODate(prevWeek)}`}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Previous
          </Link>
          <Link
            href="/plan"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            This week
          </Link>
          <Link
            href={`/plan?week=${toISODate(nextWeek)}`}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Next
          </Link>
        </div>
      </div>

      {(recipeOptions ?? []).length === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Add a{" "}
          <Link href="/recipes/new" className="font-medium underline">
            recipe
          </Link>{" "}
          before you can plan meals.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
              <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">
                Day
              </th>
              {slots.map((s) => (
                <th
                  key={s}
                  className="px-2 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400"
                >
                  {slotLabel[s]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const dStr = toISODate(d);
              const weekday = d.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              return (
                <tr
                  key={dStr}
                  className="border-b border-zinc-100 dark:border-zinc-800/80"
                >
                  <td className="whitespace-nowrap px-3 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {weekday}
                  </td>
                  {slots.map((slot) => {
                    const key = `${dStr}|${slot}`;
                    const meals = byDateSlot.get(key) ?? [];
                    return (
                      <td key={slot} className="align-top px-2 py-2">
                        <ul className="space-y-2">
                          {meals.map((m) => {
                            const r = m.recipes as unknown as { title: string } | null;
                            return (
                              <li
                                key={m.id}
                                className="rounded-lg bg-zinc-50 px-2 py-1.5 dark:bg-zinc-900/80"
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <span className="text-zinc-800 dark:text-zinc-200">
                                    {r?.title ?? "Recipe"}
                                  </span>
                                  <DeletePlannedMealButton id={m.id} />
                                </div>
                                <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                                  ×{m.servings_multiplier}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                        <AddMealForm
                          planDate={dStr}
                          mealSlot={slot}
                          recipes={recipeOptions ?? []}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
