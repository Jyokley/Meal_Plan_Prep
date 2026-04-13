"use client";

import { deletePlannedMealAction } from "@/app/actions/plan";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeletePlannedMealButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!confirm("Remove this meal from the plan?")) return;
    setPending(true);
    try {
      await deletePlannedMealAction(id);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-red-600 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-red-400"
      title="Remove"
      aria-label="Remove meal"
    >
      ✕
    </button>
  );
}
