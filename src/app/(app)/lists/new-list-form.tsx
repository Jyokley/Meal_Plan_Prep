"use client";

import { createEmptyListAction } from "@/app/actions/shopping";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewListForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const id = await createEmptyListAction(name);
      router.push(`/lists/${id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 flex touch-manipulation flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-2"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="List name"
        className="min-h-[48px] w-full flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 sm:min-h-0 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-[48px] w-full rounded-xl border border-zinc-300 px-4 py-3 text-base font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60 sm:w-auto sm:min-h-0 sm:rounded-lg sm:py-2 sm:text-sm dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        {pending ? "Creating…" : "Create"}
      </button>
    </form>
  );
}
