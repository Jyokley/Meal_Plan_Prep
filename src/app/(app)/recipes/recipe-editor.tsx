"use client";

import { deleteRecipeAction, saveRecipeAction } from "@/app/actions/recipes";
import type { Recipe, RecipeIngredient } from "@/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Row = {
  amount: string;
  unit: string;
  name: string;
  notes: string;
};

function emptyRow(): Row {
  return { amount: "", unit: "", name: "", notes: "" };
}

export function RecipeEditor({
  recipe,
  ingredients,
}: {
  recipe?: Recipe;
  ingredients?: RecipeIngredient[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(recipe?.title ?? "");
  const [instructions, setInstructions] = useState(recipe?.instructions ?? "");
  const [servings, setServings] = useState(String(recipe?.servings ?? 4));
  const [rows, setRows] = useState<Row[]>(() => {
    if (ingredients?.length) {
      return ingredients.map((i) => ({
        amount: i.amount != null ? String(i.amount) : "",
        unit: i.unit ?? "",
        name: i.name,
        notes: i.notes ?? "",
      }));
    }
    return [emptyRow(), emptyRow(), emptyRow()];
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const canDelete = !!recipe;

  const parsedIngredients = useMemo(() => {
    return rows
      .filter((r) => r.name.trim())
      .map((r) => ({
        amount:
          r.amount.trim() === "" ? null : Number.parseFloat(r.amount.replace(",", ".")),
        unit: r.unit,
        name: r.name,
        notes: r.notes,
      }))
      .map((r) => ({
        ...r,
        amount:
          r.amount != null && !Number.isFinite(r.amount) ? null : r.amount,
      }));
  }, [rows]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const s = Number.parseFloat(servings);
      const id = await saveRecipeAction({
        id: recipe?.id,
        title,
        instructions,
        servings: Number.isFinite(s) && s > 0 ? s : 1,
        ingredients: parsedIngredients.map((i) => ({
          amount: i.amount,
          unit: i.unit,
          name: i.name,
          notes: i.notes,
        })),
      });
      router.push(`/recipes/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!recipe || !confirm("Delete this recipe?")) return;
    setPending(true);
    try {
      await deleteRecipeAction(recipe.id);
      router.push("/recipes");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setPending(false);
    }
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Title
          </label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-emerald-500/40 focus:border-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Servings (base recipe)
          </label>
          <input
            type="number"
            min={0.25}
            step="any"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            className="w-32 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-emerald-500/40 focus:border-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Instructions
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-emerald-500/40 focus:border-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Ingredients
          </h2>
          <button
            type="button"
            onClick={() => setRows((r) => [...r, emptyRow()])}
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            Add row
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <div className="hidden gap-2 text-xs font-medium uppercase text-zinc-500 sm:grid sm:grid-cols-[6rem_6rem_1fr_1fr] dark:text-zinc-400">
            <span>Amount</span>
            <span>Unit</span>
            <span>Name</span>
            <span>Notes</span>
          </div>
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid gap-2 sm:grid-cols-[6rem_6rem_1fr_1fr_auto]"
            >
              <input
                placeholder="Amt"
                value={row.amount}
                onChange={(e) => updateRow(i, { amount: e.target.value })}
                className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <input
                placeholder="Unit"
                value={row.unit}
                onChange={(e) => updateRow(i, { unit: e.target.value })}
                className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <input
                placeholder="Ingredient name"
                value={row.name}
                onChange={(e) => updateRow(i, { name: e.target.value })}
                className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 sm:col-span-1"
              />
              <input
                placeholder="Notes"
                value={row.notes}
                onChange={(e) => updateRow(i, { notes: e.target.value })}
                className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={() => setRows((r) => r.filter((_, j) => j !== i))}
                className="rounded-lg px-2 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Remove row"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save recipe"}
        </button>
        <Link
          href="/recipes"
          className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Cancel
        </Link>
        {canDelete ? (
          <button
            type="button"
            disabled={pending}
            onClick={onDelete}
            className="ml-auto rounded-lg border border-red-200 px-5 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}
