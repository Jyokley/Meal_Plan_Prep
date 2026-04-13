"use client";

import { addPlannedMealsBatchAction } from "@/app/actions/plan";
import type { MealSlot } from "@/types/database";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const slots: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

const slotLabel: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const dayLetter = ["M", "T", "W", "T", "F", "S", "S"];

export function AddMealPicker({
  weekDayIsos,
  initialDate,
  initialSlot,
  recipes,
  onClose,
}: {
  weekDayIsos: string[];
  initialDate: string;
  initialSlot: MealSlot;
  recipes: { id: string; title: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [recipeId, setRecipeId] = useState(recipes[0]?.id ?? "");
  const [mealSlot, setMealSlot] = useState<MealSlot>(initialSlot);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set([initialDate]),
  );
  const [mult, setMult] = useState("1");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const weekdayIsos = useMemo(
    () => weekDayIsos.slice(0, 5),
    [weekDayIsos],
  );

  function toggleDate(iso: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipeId) return;
    setError(null);
    setPending(true);
    try {
      const m = Number.parseFloat(mult);
      await addPlannedMealsBatchAction({
        planDates: [...selected],
        mealSlot,
        recipeId,
        servingsMultiplier: Number.isFinite(m) && m > 0 ? m : 1,
      });
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  if (recipes.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 p-0 sm:items-center sm:justify-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-meal-title"
        className="relative z-10 flex max-h-[min(92vh,720px)] w-full flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950 sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl"
      >
        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="border-b border-zinc-100 px-4 pb-3 pt-4 dark:border-zinc-800">
            <h2
              id="add-meal-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Add to meal plan
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Choose recipe, meal, and which days in this week.
            </p>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
            <div>
              <label
                htmlFor="plan-recipe"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Recipe
              </label>
              <select
                id="plan-recipe"
                value={recipeId}
                onChange={(e) => setRecipeId(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-base text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Meal
              </span>
              <div className="grid grid-cols-2 gap-2">
                {slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setMealSlot(s)}
                    className={`min-h-[44px] rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                      mealSlot === s
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-100"
                        : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600"
                    }`}
                  >
                    {slotLabel[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Days this week
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(new Set(weekdayIsos))}
                    className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Weekdays
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(new Set(weekDayIsos))}
                    className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    All week
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {weekDayIsos.map((iso, i) => {
                  const on = selected.has(iso);
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => toggleDate(iso)}
                      aria-pressed={on}
                      className={`flex min-h-[44px] flex-col items-center justify-center rounded-xl border text-sm font-medium transition ${
                        on
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-100"
                          : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                      }`}
                    >
                      <span className="text-xs text-zinc-500 dark:text-zinc-500">
                        {dayLetter[i]}
                      </span>
                      <span className="text-xs tabular-nums">
                        {iso.slice(8, 10)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selected.size === 0 ? (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  Select at least one day to save.
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="plan-mult"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Portions for this meal
              </label>
              <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                How many servings you need from this recipe. Shopping lists scale
                ingredients with the recipe’s total servings (e.g. recipe serves 12 and
                you enter 2 → one sixth of each ingredient). On the meal plan, calories
                use this as the number of people sharing the meal when it’s 1 or more
                (total food calories are divided evenly so daily totals reflect one
                person’s intake).
              </p>
              <input
                id="plan-mult"
                type="number"
                min={0.25}
                step="any"
                value={mult}
                onChange={(e) => setMult(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-base text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            {error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : null}
          </div>

          <div className="flex gap-3 border-t border-zinc-100 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] dark:border-zinc-800 sm:pb-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] flex-1 rounded-xl border border-zinc-300 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || selected.size === 0 || !recipeId}
              className="min-h-[48px] flex-1 rounded-xl bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {pending ? "Adding…" : `Add${selected.size > 1 ? ` (${selected.size} days)` : ""}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
