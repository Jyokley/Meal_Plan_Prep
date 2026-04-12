"use client";

import { addGroceryExpenseAction } from "@/app/actions/budget";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ExpenseForm({
  defaultDate,
  lists,
}: {
  defaultDate: string;
  lists: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [spentAt, setSpentAt] = useState(defaultDate);
  const [store, setStore] = useState("");
  const [notes, setNotes] = useState("");
  const [listId, setListId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const dollars = Number.parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(dollars) || dollars < 0) {
      setError("Enter a valid amount");
      return;
    }
    const cents = Math.round(dollars * 100);
    setPending(true);
    try {
      await addGroceryExpenseAction({
        amountCents: cents,
        spentAt,
        storeName: store,
        notes,
        shoppingListId: listId || null,
      });
      setAmount("");
      setStore("");
      setNotes("");
      setListId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add expense");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Amount (USD)
        </label>
        <input
          required
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Date
        </label>
        <input
          required
          type="date"
          value={spentAt}
          onChange={(e) => setSpentAt(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Store (optional)
        </label>
        <input
          value={store}
          onChange={(e) => setStore(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Link to list (optional)
        </label>
        <select
          value={listId}
          onChange={(e) => setListId(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="">—</option>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Notes (optional)
        </label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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
          {pending ? "Saving…" : "Add expense"}
        </button>
      </div>
    </form>
  );
}
