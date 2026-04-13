"use client";

import {
  estimateIngredientCaloriesAction,
  estimateRecipeIngredientRowsAction,
} from "@/app/actions/nutrition";
import { deleteRecipeAction, saveRecipeAction } from "@/app/actions/recipes";
import type { ImportedRecipeDraft } from "@/lib/recipe-jsonld";
import type { Recipe, RecipeIngredient } from "@/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Row = {
  amount: string;
  unit: string;
  name: string;
  notes: string;
  caloriesKcal: string;
};

function emptyRow(): Row {
  return { amount: "", unit: "", name: "", notes: "", caloriesKcal: "" };
}

export function RecipeEditor({
  recipe,
  ingredients,
  prefill,
}: {
  recipe?: Recipe;
  ingredients?: RecipeIngredient[];
  prefill?: ImportedRecipeDraft;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(
    () => recipe?.title ?? prefill?.title ?? "",
  );
  const [instructions, setInstructions] = useState(
    () => recipe?.instructions ?? prefill?.instructions ?? "",
  );
  const [servings, setServings] = useState(() =>
    String(recipe?.servings ?? prefill?.servings ?? 4),
  );
  const [sourceUrl, setSourceUrl] = useState(
    () => recipe?.source_url ?? prefill?.sourceUrl ?? "",
  );
  const [rows, setRows] = useState<Row[]>(() => {
    if (ingredients?.length) {
      return ingredients.map((i) => ({
        amount: i.amount != null ? String(i.amount) : "",
        unit: i.unit ?? "",
        name: i.name,
        notes: i.notes ?? "",
        caloriesKcal:
          i.calories_kcal != null && Number.isFinite(i.calories_kcal)
            ? String(i.calories_kcal)
            : "",
      }));
    }
    if (prefill?.ingredients?.length) {
      return [
        ...prefill.ingredients.map((i) => ({
          amount: i.amount != null ? String(i.amount) : "",
          unit: i.unit,
          name: i.name,
          notes: "",
          caloriesKcal: "",
        })),
        emptyRow(),
      ];
    }
    return [emptyRow(), emptyRow(), emptyRow()];
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [estimating, setEstimating] = useState<number | "all" | null>(null);

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
        caloriesKcal: r.caloriesKcal.trim(),
      }))
      .map((r) => ({
        ...r,
        amount:
          r.amount != null && !Number.isFinite(r.amount) ? null : r.amount,
      }));
  }, [rows]);

  const lineCalorieTotal = useMemo(() => {
    let sum = 0;
    let any = false;
    for (const r of rows) {
      if (!r.name.trim()) continue;
      const v = Number.parseFloat(r.caloriesKcal.replace(",", "."));
      if (Number.isFinite(v) && v >= 0) {
        sum += v;
        any = true;
      }
    }
    return any ? sum : null;
  }, [rows]);

  const perServingCalories = useMemo(() => {
    const s = Number.parseFloat(servings.replace(",", "."));
    if (lineCalorieTotal == null || !Number.isFinite(s) || s <= 0) return null;
    return lineCalorieTotal / s;
  }, [lineCalorieTotal, servings]);

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
        source_url: sourceUrl.trim() || null,
        ingredients: parsedIngredients.map((i) => {
          const ck = i.caloriesKcal.trim();
          const parsed =
            ck === "" ? null : Number.parseFloat(ck.replace(",", "."));
          return {
            amount: i.amount,
            unit: i.unit,
            name: i.name,
            notes: i.notes,
            calories_kcal:
              parsed != null && Number.isFinite(parsed) && parsed >= 0
                ? parsed
                : null,
          };
        }),
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

  async function estimateRowCalories(i: number) {
    const row = rows[i];
    if (!row.name.trim()) {
      setError("Add an ingredient name first.");
      return;
    }
    setError(null);
    setEstimating(i);
    try {
      const amount =
        row.amount.trim() === ""
          ? null
          : Number.parseFloat(row.amount.replace(",", "."));
      const res = await estimateIngredientCaloriesAction({
        name: row.name,
        amount: amount != null && Number.isFinite(amount) ? amount : null,
        unit: row.unit,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      updateRow(i, {
        caloriesKcal: String(res.kcal),
      });
    } finally {
      setEstimating(null);
    }
  }

  async function estimateAllRows() {
    setError(null);
    const payload = rows
      .map((row) => ({
        name: row.name,
        amount:
          row.amount.trim() === ""
            ? null
            : Number.parseFloat(row.amount.replace(",", ".")),
        unit: row.unit,
      }))
      .filter((row) => row.name.trim().length > 0);

    if (payload.length === 0) {
      setError("Add at least one ingredient with a name.");
      return;
    }

    setEstimating("all");
    try {
      const { results } = await estimateRecipeIngredientRowsAction(payload);
      let idx = 0;
      setRows((prev) => {
        const next = [...prev];
        for (let i = 0; i < next.length; i++) {
          if (!next[i].name.trim()) continue;
          const r = results[idx];
          idx += 1;
          if (r?.ok) {
            next[i] = { ...next[i], caloriesKcal: String(r.kcal) };
          }
        }
        return next;
      });
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        setError(
          failed.length === results.length
            ? failed[0].message
            : `${failed.length} line(s) could not be estimated. Check amounts/units and USDA key.`,
        );
      }
    } finally {
      setEstimating(null);
    }
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
            Source link (optional)
          </label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://…"
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Ingredients
          </h2>
          <button
            type="button"
            onClick={estimateAllRows}
            disabled={pending || estimating !== null}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 sm:w-auto dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            {estimating === "all" ? "Estimating…" : "Estimate all (USDA)"}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          USDA lookup uses FoodData Central (Foundation / FNDDS / SR Legacy). Enter
          amount + unit (g, oz, cup, tbsp, …). Volumes assume water density except
          where noted—use grams for best accuracy.
        </p>

        <div className="mt-4 space-y-4">
          {rows.map((row, i) => (
            <div
              key={i}
              className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800/80 sm:border-0 sm:p-0"
            >
              <div className="grid gap-2 sm:grid-cols-[5rem_5rem_1fr_1fr_5.5rem_auto_auto]">
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
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm sm:col-span-1 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <input
                  placeholder="Notes"
                  value={row.notes}
                  onChange={(e) => updateRow(i, { notes: e.target.value })}
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <input
                  type="number"
                  min={0}
                  step="any"
                  placeholder="kcal"
                  title="Kilocalories for this line (full recipe)"
                  value={row.caloriesKcal}
                  onChange={(e) =>
                    updateRow(i, { caloriesKcal: e.target.value })
                  }
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => estimateRowCalories(i)}
                  disabled={pending || estimating !== null}
                  className="rounded-lg border border-emerald-200 px-2 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
                >
                  {estimating === i ? "…" : "USDA"}
                </button>
                <button
                  type="button"
                  onClick={() => setRows((r) => r.filter((_, j) => j !== i))}
                  className="rounded-lg px-2 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="Remove row"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setRows((r) => [...r, emptyRow()])}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 text-sm font-medium text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 dark:border-zinc-600 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        >
          + Add row
        </button>

        {lineCalorieTotal != null ? (
          <div className="mt-4 rounded-lg bg-zinc-50 px-4 py-3 text-sm dark:bg-zinc-900/60">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              Recipe total (estimated):{" "}
            </span>
            <span className="text-zinc-700 dark:text-zinc-300">
              {Math.round(lineCalorieTotal)} kcal
            </span>
            {perServingCalories != null ? (
              <span className="text-zinc-600 dark:text-zinc-400">
                {" "}
                · ~{Math.round(perServingCalories * 10) / 10} kcal per serving
              </span>
            ) : null}
          </div>
        ) : null}
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
