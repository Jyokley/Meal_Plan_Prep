"use client";

import { addListItemAction } from "@/app/actions/shopping";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddListItemForm({ listId }: { listId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    try {
      await addListItemAction(listId, name, unit);
      setName("");
      setUnit("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 touch-manipulation sm:flex-row sm:flex-wrap sm:gap-2"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        enterKeyHint="done"
        className="min-h-[48px] w-full flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 sm:min-h-0 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
      />
      <input
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        placeholder="Unit (optional)"
        className="min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 sm:h-auto sm:w-32 sm:min-h-0 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-[48px] w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-medium text-white hover:bg-emerald-700 disabled:opacity-60 sm:w-auto sm:min-h-0 sm:rounded-lg sm:py-2 sm:text-sm"
      >
        Add item
      </button>
    </form>
  );
}
