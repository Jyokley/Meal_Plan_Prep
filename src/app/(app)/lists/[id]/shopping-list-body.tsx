"use client";

import type { ShoppingListItem } from "@/types/database";
import { ListItemRow } from "./list-item-row";

/** Unchecked items first so the active shopping list stays at the top. */
export function ShoppingListBody({
  items,
  listId,
}: {
  items: ShoppingListItem[];
  listId: string;
}) {
  const sorted = [...items].sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    return a.sort_order - b.sort_order;
  });

  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {sorted.map((item) => (
        <ListItemRow key={item.id} item={item} listId={listId} />
      ))}
    </ul>
  );
}
