"use client";

import { copyMealPlanToNextWeekAction } from "@/app/actions/plan";
import { addDays, parseISODate, toISODate } from "@/lib/dates";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CopyWeekToNextButton({
  sourceWeekMonday,
  mealCount,
}: {
  sourceWeekMonday: string;
  mealCount: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (mealCount === 0) return;
    const nextMon = addDays(parseISODate(sourceWeekMonday), 7);
    const nextSun = addDays(nextMon, 6);
    const ok = window.confirm(
      `Copy all meals from this week to ${toISODate(nextMon)} – ${toISODate(nextSun)}? Anything already planned for that week will be replaced.`,
    );
    if (!ok) return;
    setPending(true);
    try {
      const { copied } = await copyMealPlanToNextWeekAction(sourceWeekMonday);
      if (copied === 0) {
        window.alert("This week has no meals to copy.");
        return;
      }
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Copy failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending || mealCount === 0}
      title={
        mealCount === 0
          ? "Add meals to this week first"
          : "Duplicate this week’s plan into the following week"
      }
      onClick={onClick}
      className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
    >
      {pending ? "Copying…" : "Copy to next week"}
    </button>
  );
}
