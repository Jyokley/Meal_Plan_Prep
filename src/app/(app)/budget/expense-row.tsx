"use client";

import { deleteGroceryExpenseAction } from "@/app/actions/budget";
import type { GroceryExpense } from "@/types/database";
import { useRouter } from "next/navigation";
import { useState } from "react";

function formatCents(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function ExpenseRow({ expense }: { expense: GroceryExpense }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (!confirm("Remove this expense?")) return;
    setPending(true);
    try {
      await deleteGroceryExpenseAction(expense.id);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div>
        <p className="font-medium text-zinc-900 dark:text-zinc-50">
          {formatCents(expense.amount_cents)}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {expense.spent_at}
          {expense.store_name ? ` · ${expense.store_name}` : ""}
          {expense.notes ? ` · ${expense.notes}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="text-sm text-zinc-500 hover:text-red-600 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-red-400"
      >
        Remove
      </button>
    </li>
  );
}
