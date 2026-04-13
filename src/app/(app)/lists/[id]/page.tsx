import { createClient } from "@/lib/supabase/server";
import { getPrimaryHousehold } from "@/lib/household";
import type { ShoppingListItem } from "@/types/database";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AddListItemForm } from "./add-list-item-form";
import { DeleteListButton } from "./delete-list-button";
import { ShoppingListBody } from "./shopping-list-body";

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
    <div className="mx-auto w-full max-w-2xl space-y-6 pb-8 sm:space-y-8 sm:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Link
            href="/lists"
            className="-mx-2 inline-flex min-h-[44px] items-center px-2 text-base font-medium text-emerald-600 hover:underline sm:text-sm dark:text-emerald-400"
          >
            ← All lists
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 sm:mt-2 sm:text-3xl dark:text-zinc-50">
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

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:rounded-xl">
        {(items ?? []).length === 0 ? (
          <p className="px-4 py-12 text-center text-base text-zinc-500 dark:text-zinc-400">
            No items yet. Add something below.
          </p>
        ) : (
          <ShoppingListBody
            items={(items ?? []) as ShoppingListItem[]}
            listId={list.id}
          />
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:rounded-xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Add item
        </p>
        <AddListItemForm listId={list.id} />
      </div>
    </div>
  );
}
