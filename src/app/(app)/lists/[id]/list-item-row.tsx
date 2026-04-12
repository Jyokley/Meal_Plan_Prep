"use client";

import { toggleListItemAction } from "@/app/actions/shopping";
import type { ShoppingListItem } from "@/types/database";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function ListItemRow({
  item,
  listId,
}: {
  item: ShoppingListItem;
  listId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const label = item.display_text?.trim() || item.name;

  function onToggle() {
    startTransition(async () => {
      await toggleListItemAction(item.id, !item.checked, listId);
      router.refresh();
    });
  }

  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
      <input
        type="checkbox"
        checked={item.checked}
        onChange={onToggle}
        disabled={pending}
        className="size-4 rounded border-zinc-400 text-emerald-600 focus:ring-emerald-500"
      />
      <span
        className={`flex-1 text-sm ${
          item.checked
            ? "text-zinc-400 line-through dark:text-zinc-500"
            : "text-zinc-900 dark:text-zinc-100"
        }`}
      >
        {label}
      </span>
    </li>
  );
}
