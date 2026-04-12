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
      className="flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        className="min-w-[10rem] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
      <input
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        placeholder="Unit (optional)"
        className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        Add
      </button>
    </form>
  );
}
