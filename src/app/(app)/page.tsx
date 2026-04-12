import { rotateInviteForCurrentHouseholdAction } from "@/app/actions/household";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryHousehold } from "@/lib/household";
import Link from "next/link";

function formatCents(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data: expenses } = await supabase
    .from("grocery_expenses")
    .select("amount_cents")
    .eq("household_id", ctx.household.id)
    .gte("spent_at", startOfMonth.toISOString().slice(0, 10))
    .lte("spent_at", endOfMonth.toISOString().slice(0, 10));

  const spent = (expenses ?? []).reduce((s, e) => s + e.amount_cents, 0);
  const budget = ctx.household.monthly_budget_cents;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Plan meals, build lists, and stay on budget together.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/recipes"
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-emerald-800"
        >
          <h2 className="font-medium text-zinc-900 dark:text-zinc-50">Recipes</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Add and edit household recipes.
          </p>
        </Link>
        <Link
          href="/plan"
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-emerald-800"
        >
          <h2 className="font-medium text-zinc-900 dark:text-zinc-50">Meal plan</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Schedule meals for the week.
          </p>
        </Link>
        <Link
          href="/lists"
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-emerald-800"
        >
          <h2 className="font-medium text-zinc-900 dark:text-zinc-50">Shopping lists</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Generate from your plan or manage lists.
          </p>
        </Link>
        <Link
          href="/budget"
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-emerald-800"
        >
          <h2 className="font-medium text-zinc-900 dark:text-zinc-50">Budget</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Log trips and compare to your monthly target.
          </p>
        </Link>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          This month
        </h2>
        <p className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {formatCents(spent)} spent
          {budget != null ? (
            <span className="text-lg font-normal text-zinc-600 dark:text-zinc-400">
              {" "}
              of {formatCents(budget)} budget
            </span>
          ) : (
            <span className="text-lg font-normal text-zinc-600 dark:text-zinc-400">
              {" "}
              (no budget set)
            </span>
          )}
        </p>
        {budget != null && budget > 0 ? (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${Math.min(100, (spent / budget) * 100)}%`,
              }}
            />
          </div>
        ) : null}
      </section>

      {ctx.membership.role === "owner" ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Invite household members
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Share this code so others can join. Rotate it anytime if it was shared
            too widely.
          </p>
          <p className="mt-4 font-mono text-lg tracking-wide text-zinc-900 dark:text-zinc-100">
            {ctx.household.invite_code}
          </p>
          <form className="mt-4" action={rotateInviteForCurrentHouseholdAction}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Generate new code
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
