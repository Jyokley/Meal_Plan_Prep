"use client";

import { addPlannedMealAction } from "@/app/actions/plan";
import type { MealSlot } from "@/types/database";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddMealForm({
  planDate,
  mealSlot,
  recipes,
}: {
  planDate: string;
  mealSlot: MealSlot;
  recipes: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [recipeId, setRecipeId] = useState(recipes[0]?.id ?? "");
  const [mult, setMult] = useState("1");
  const [pending, setPending] = useState(false);

  if (recipes.length === 0) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipeId) return;
    setPending(true);
    try {
      const m = Number.parseFloat(mult);
      await addPlannedMealAction({
        planDate,
        mealSlot,
        recipeId,
        servingsMultiplier: Number.isFinite(m) && m > 0 ? m : 1,
      });
      setOpen(false);
      setMult("1");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 w-full rounded border border-dashed border-zinc-300 py-1.5 text-xs font-medium text-zinc-500 hover:border-emerald-400 hover:text-emerald-700 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
      >
        + Add
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-2 space-y-2 rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <select
        value={recipeId}
        onChange={(e) => setRecipeId(e.target.value)}
        className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
      >
        {recipes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.title}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={0.25}
        step="any"
        value={mult}
        onChange={(e) => setMult(e.target.value)}
        placeholder="× servings"
        title="Servings multiplier"
        className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
      />
      <div className="flex gap-1">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded bg-emerald-600 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
