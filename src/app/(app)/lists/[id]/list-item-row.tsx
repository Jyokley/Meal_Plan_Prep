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
    <li className="touch-manipulation">
      <label
        className={`flex min-h-[3.25rem] cursor-pointer items-center gap-4 px-4 py-3.5 transition active:bg-zinc-100 sm:min-h-12 sm:gap-3 sm:px-3 sm:py-2.5 dark:active:bg-zinc-800/80 ${
          item.checked ? "bg-zinc-50/80 dark:bg-zinc-900/40" : "bg-white dark:bg-zinc-950"
        } ${pending ? "opacity-60" : ""}`}
      >
        <input
          type="checkbox"
          checked={item.checked}
          onChange={onToggle}
          disabled={pending}
          className="size-6 shrink-0 rounded-md border-2 border-zinc-400 text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:border-zinc-500 dark:focus:ring-offset-zinc-950 sm:size-5"
        />
        <span
          className={`flex-1 text-base leading-snug sm:text-sm ${
            item.checked
              ? "text-zinc-400 line-through dark:text-zinc-500"
              : "text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {label}
        </span>
      </label>
    </li>
  );
}
