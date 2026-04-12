"use client";

import { generateShoppingListAction } from "@/app/actions/shopping";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerateListForm({
  defaultStart,
  defaultEnd,
}: {
  defaultStart: string;
  defaultEnd: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const id = await generateShoppingListAction({
        name: name.trim(),
        startDate: start,
        endDate: end,
      });
      router.push(`/lists/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate list");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          List name (optional)
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Week of groceries"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Start date
        </label>
        <input
          type="date"
          required
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          End date
        </label>
        <input
          type="date"
          required
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>
      {error ? (
        <p className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Generating…" : "Generate list"}
        </button>
      </div>
    </form>
  );
}
