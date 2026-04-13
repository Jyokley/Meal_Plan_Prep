"use client";

import { deleteShoppingListAction } from "@/app/actions/shopping";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteListButton({ listId }: { listId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!confirm("Delete this list and all its items?")) return;
    setPending(true);
    try {
      await deleteShoppingListAction(listId);
      router.push("/lists");
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
      className="w-full min-h-[48px] shrink-0 rounded-xl border border-red-200 px-4 py-3 text-base font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 sm:w-auto sm:min-h-0 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
    >
      Delete list
    </button>
  );
}
