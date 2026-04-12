import { createClient } from "@/lib/supabase/server";
import { toISODate, startOfWeekMonday, addDays } from "@/lib/dates";
import { getPrimaryHousehold } from "@/lib/household";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GenerateListForm } from "./generate-list-form";
import { NewListForm } from "./new-list-form";

export default async function ListsPage() {
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) redirect("/onboarding");

  const { data: lists } = await supabase
    .from("shopping_lists")
    .select("id, name, created_at, generated_from_start, generated_from_end")
    .eq("household_id", ctx.household.id)
    .order("created_at", { ascending: false });

  const monday = startOfWeekMonday(new Date());
  const defaultStart = toISODate(monday);
  const defaultEnd = toISODate(addDays(monday, 6));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Shopping lists
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Generate from your meal plan or keep a manual list.
        </p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Generate from meal plan
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Merges ingredients from planned meals in the date range (exact name + unit).
        </p>
        <GenerateListForm defaultStart={defaultStart} defaultEnd={defaultEnd} />
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          New empty list
        </h2>
        <NewListForm />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Your lists
        </h2>
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {(lists ?? []).length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No lists yet. Generate one or create an empty list above.
            </li>
          ) : (
            (lists ?? []).map((l) => (
              <li key={l.id}>
                <Link
                  href={`/lists/${l.id}`}
                  className="block px-5 py-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {l.name}
                  </span>
                  {l.generated_from_start && l.generated_from_end ? (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      From plan {l.generated_from_start} – {l.generated_from_end}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
