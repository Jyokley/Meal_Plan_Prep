import { createClient } from "@/lib/supabase/server";
import { getPrimaryHousehold } from "@/lib/household";
import type { ShoppingListItem } from "@/types/database";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AddListItemForm } from "./add-list-item-form";
import { DeleteListButton } from "./delete-list-button";
import { ListItemRow } from "./list-item-row";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) redirect("/onboarding");

  const { data: list } = await supabase
    .from("shopping_lists")
    .select("id, name, generated_from_start, generated_from_end")
    .eq("id", id)
    .eq("household_id", ctx.household.id)
    .single();

  if (!list) notFound();

  const { data: items } = await supabase
    .from("shopping_list_items")
    .select("*")
    .eq("list_id", id)
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/lists"
            className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
          >
            ← All lists
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {list.name}
          </h1>
          {list.generated_from_start && list.generated_from_end ? (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              From meal plan {list.generated_from_start} – {list.generated_from_end}
            </p>
          ) : null}
        </div>
        <DeleteListButton listId={list.id} />
      </div>

      <ul className="space-y-1 rounded-xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950">
        {(items ?? []).length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No items yet. Add something below.
          </li>
        ) : (
          (items ?? []).map((item) => (
            <ListItemRow
              key={item.id}
              item={item as ShoppingListItem}
              listId={list.id}
            />
          ))
        )}
      </ul>

      <AddListItemForm listId={list.id} />
    </div>
  );
}
