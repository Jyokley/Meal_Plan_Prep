"use client";

import { addGroceryExpenseAction } from "@/app/actions/budget";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ExpenseForm({
  defaultDate,
  lists,
  fixedListId,
  embedOnList = false,
}: {
  defaultDate: string;
  lists: { id: string; name: string }[];
  /** Hide list picker and always attach expense to this shopping list */
  fixedListId?: string;
  /** Larger touch targets for use on the shopping list page */
  embedOnList?: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [spentAt, setSpentAt] = useState(defaultDate);
  const [store, setStore] = useState("");
  const [notes, setNotes] = useState("");
  const [listId, setListId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const field = embedOnList
    ? "w-full min-h-[48px] rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 sm:min-h-0 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
    : "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  const label =
    embedOnList
      ? "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      : "mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400";

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
        shoppingListId: fixedListId ?? (listId || null),
      });
      setAmount("");
      setStore("");
      setNotes("");
      if (!fixedListId) setListId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add expense");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`mt-4 grid ${embedOnList ? "gap-4" : "gap-3"} sm:grid-cols-2`}
    >
      <div>
        <label className={label}>Amount (USD)</label>
        <input
          required
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={field}
        />
      </div>
      <div>
        <label className={label}>Date</label>
        <input
          required
          type="date"
          value={spentAt}
          onChange={(e) => setSpentAt(e.target.value)}
          className={field}
        />
      </div>
      <div>
        <label className={label}>Store (optional)</label>
        <input
          value={store}
          onChange={(e) => setStore(e.target.value)}
          className={field}
        />
      </div>
      {!fixedListId ? (
        <div>
          <label className={label}>Link to list (optional)</label>
          <select
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            className={field}
          >
            <option value="">—</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <label className={label}>Notes (optional)</label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={field}
        />
      </div>
      {error ? (
        <p className="text-sm text-red-600 sm:col-span-2 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className={
            embedOnList
              ? "min-h-[48px] w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-medium text-white hover:bg-emerald-700 disabled:opacity-60 sm:w-auto sm:rounded-lg sm:py-2 sm:text-sm"
              : "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          }
        >
          {pending ? "Saving…" : "Add expense"}
        </button>
      </div>
    </form>
  );
}
