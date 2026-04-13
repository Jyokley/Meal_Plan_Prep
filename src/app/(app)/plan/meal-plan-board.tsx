"use client";

import type { MealSlot } from "@/types/database";
import Link from "next/link";
import { useState } from "react";
import { AddMealPicker } from "./add-meal-picker";
import { CopyWeekToNextButton } from "./copy-week-to-next-button";
import { DeletePlannedMealButton } from "./delete-planned-meal-button";

const slots: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

const slotLabel: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export type PlannedMealItem = {
  id: string;
  plan_date: string;
  meal_slot: MealSlot;
  servings_multiplier: number;
  recipe_title: string;
  /** Estimated kcal for one person for this meal (meal total ÷ portions when portions ≥ 1), or null */
  meal_calories_kcal: number | null;
};

function mealBlock(
  meals: PlannedMealItem[],
  onAdd: () => void,
  recipesLength: number,
) {
  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {meals.map((m) => (
          <li
            key={m.id}
            className="rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-900/80"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {m.recipe_title}
              </span>
              <DeletePlannedMealButton id={m.id} />
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {m.servings_multiplier}{" "}
              {m.servings_multiplier === 1 ? "portion" : "portions"}
              {m.meal_calories_kcal != null ? (
                <span className="text-zinc-600 dark:text-zinc-400">
                  {" "}
                  · ~{Math.round(m.meal_calories_kcal)} kcal / person
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {recipesLength > 0 ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-dashed border-zinc-300 text-sm font-medium text-zinc-600 hover:border-emerald-400 hover:text-emerald-700 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
        >
          Add meal
        </button>
      ) : null}
    </div>
  );
}

function dayCaloriesTotal(
  dStr: string,
  byDateSlot: Map<string, PlannedMealItem[]>,
): number | null {
  let sum = 0;
  let any = false;
  for (const slot of slots) {
    const meals = byDateSlot.get(`${dStr}|${slot}`) ?? [];
    for (const m of meals) {
      if (m.meal_calories_kcal != null) {
        sum += m.meal_calories_kcal;
        any = true;
      }
    }
  }
  return any ? sum : null;
}

export function MealPlanBoard({
  weekLabelStart,
  weekLabelEnd,
  weekDayIsos,
  dayLabels,
  planned,
  recipes,
  prevWeekHref,
  nextWeekHref,
}: {
  weekLabelStart: string;
  weekLabelEnd: string;
  weekDayIsos: string[];
  dayLabels: string[];
  planned: PlannedMealItem[];
  recipes: { id: string; title: string }[];
  prevWeekHref: string;
  nextWeekHref: string;
}) {
  const [picker, setPicker] = useState<null | { date: string; slot: MealSlot }>(
    null,
  );
  const [pickerKey, setPickerKey] = useState(0);

  function openPicker(date: string, slot: MealSlot) {
    setPicker({ date, slot });
    setPickerKey((k) => k + 1);
  }

  const byDateSlot = new Map<string, PlannedMealItem[]>();
  for (const row of planned) {
    const key = `${row.plan_date}|${row.meal_slot}`;
    const list = byDateSlot.get(key) ?? [];
    list.push(row);
    byDateSlot.set(key, list);
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Meal plan
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Week of {weekLabelStart} – {weekLabelEnd}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Calorie totals are per person (each meal’s food is split by portions when
            portions ≥ 1).
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <Link
              href={prevWeekHref}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Previous
            </Link>
            <Link
              href="/plan"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              This week
            </Link>
            <Link
              href={nextWeekHref}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Next
            </Link>
          </div>
          <CopyWeekToNextButton
            sourceWeekMonday={weekLabelStart}
            mealCount={planned.length}
          />
        </div>
      </div>

      {/* Mobile: one card per day */}
      <div className="space-y-4 md:hidden">
        {weekDayIsos.map((dStr, i) => {
          const dayK = dayCaloriesTotal(dStr, byDateSlot);
          return (
            <section
              key={dStr}
              className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <h2 className="mb-4 border-b border-zinc-100 pb-2 text-base font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                <span>{dayLabels[i]}</span>
                {dayK != null ? (
                  <span className="ml-2 font-normal text-emerald-700 dark:text-emerald-400">
                    ~{Math.round(dayK)} kcal / person
                  </span>
                ) : null}
              </h2>
              <div className="space-y-5">
                {slots.map((slot) => {
                  const key = `${dStr}|${slot}`;
                  const meals = byDateSlot.get(key) ?? [];
                  return (
                    <div key={slot}>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {slotLabel[slot]}
                      </h3>
                      {mealBlock(
                        meals,
                        () => openPicker(dStr, slot),
                        recipes.length,
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:block">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
              <th className="px-3 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                Day
              </th>
              {slots.map((s) => (
                <th
                  key={s}
                  className="px-2 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400"
                >
                  {slotLabel[s]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weekDayIsos.map((dStr, i) => {
              const dayK = dayCaloriesTotal(dStr, byDateSlot);
              return (
                <tr
                  key={dStr}
                  className="border-b border-zinc-100 dark:border-zinc-800/80"
                >
                  <td className="align-top whitespace-nowrap px-3 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    <div>{dayLabels[i]}</div>
                    {dayK != null ? (
                      <div className="mt-1 text-xs font-normal text-emerald-700 dark:text-emerald-400">
                        ~{Math.round(dayK)} kcal / person
                      </div>
                    ) : (
                      <div className="mt-1 text-[10px] font-normal text-zinc-400">
                        —
                      </div>
                    )}
                  </td>
                  {slots.map((slot) => {
                    const key = `${dStr}|${slot}`;
                    const meals = byDateSlot.get(key) ?? [];
                    return (
                      <td key={slot} className="align-top px-2 py-3">
                        {mealBlock(
                          meals,
                          () => openPicker(dStr, slot),
                          recipes.length,
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {picker ? (
        <AddMealPicker
          key={pickerKey}
          weekDayIsos={weekDayIsos}
          initialDate={picker.date}
          initialSlot={picker.slot}
          recipes={recipes}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </>
  );
}
