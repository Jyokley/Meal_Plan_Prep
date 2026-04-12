"use client";

import { updateHouseholdBudgetAction } from "@/app/actions/household";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function BudgetTargetForm({
  householdId,
  monthlyBudgetCents,
}: {
  householdId: string;
  monthlyBudgetCents: number | null;
}) {
  const router = useRouter();
  const [dollars, setDollars] = useState(
    monthlyBudgetCents != null ? (monthlyBudgetCents / 100).toFixed(2) : "",
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const v = dollars.trim();
      const cents =
        v === ""
          ? null
          : Math.round(Number.parseFloat(v.replace(",", ".")) * 100);
      if (cents != null && (cents < 0 || !Number.isFinite(cents))) {
        return;
      }
      await updateHouseholdBudgetAction(householdId, cents);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Monthly grocery budget (USD)
        </label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={dollars}
          onChange={(e) => setDollars(e.target.value)}
          placeholder="e.g. 600"
          className="w-40 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        Save target
      </button>
      <p className="w-full text-xs text-zinc-500 dark:text-zinc-400">
        Leave empty and save to clear the target.
      </p>
    </form>
  );
}
