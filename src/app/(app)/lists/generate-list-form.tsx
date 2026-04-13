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

  const field =
    "min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 sm:min-h-0 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm";

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 grid touch-manipulation gap-4 sm:grid-cols-2 sm:gap-3"
    >
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          List name (optional)
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Week of groceries"
          className={field}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Start date
        </label>
        <input
          type="date"
          required
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className={field}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          End date
        </label>
        <input
          type="date"
          required
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className={field}
        />
      </div>
      {error ? (
        <p className="text-base text-red-600 sm:col-span-2 sm:text-sm dark:text-red-400">
          {error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-[48px] w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-medium text-white hover:bg-emerald-700 disabled:opacity-60 sm:w-auto sm:min-h-0 sm:rounded-lg sm:py-2 sm:text-sm"
        >
          {pending ? "Generating…" : "Generate list"}
        </button>
      </div>
    </form>
  );
}
