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
      className="shrink-0 text-zinc-400 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
      title="Remove"
      aria-label="Remove meal"
    >
      ✕
    </button>
  );
}
