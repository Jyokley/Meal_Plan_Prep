import { createClient } from "@/lib/supabase/server";
import { getPrimaryHousehold } from "@/lib/household";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function RecipesPage() {
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) redirect("/onboarding");

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, title, servings, updated_at")
    .eq("household_id", ctx.household.id)
    .order("title", { ascending: true });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Recipes
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Household recipes with structured ingredients for shopping lists.
          </p>
        </div>
        <Link
          href="/recipes/new"
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          New recipe
        </Link>
      </div>

      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
        {(recipes ?? []).length === 0 ? (
          <li className="px-5 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No recipes yet.{" "}
            <Link href="/recipes/new" className="font-medium text-emerald-600 hover:underline">
              Add your first
            </Link>
            .
          </li>
        ) : (
          (recipes ?? []).map((r) => (
            <li key={r.id}>
              <Link
                href={`/recipes/${r.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {r.title}
                </span>
                <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                  {r.servings} servings
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
