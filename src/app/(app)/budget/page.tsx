import { createClient } from "@/lib/supabase/server";
import { getPrimaryHousehold } from "@/lib/household";
import type { GroceryExpense, ShoppingList } from "@/types/database";
import { redirect } from "next/navigation";
import { BudgetTargetForm } from "./budget-target-form";
import { ExpenseForm } from "./expense-form";
import { ExpenseRow } from "./expense-row";

function formatCents(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) redirect("/onboarding");

  const now = new Date();
  const monthStr =
    sp.month ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = monthStr.split("-").map(Number);
  const start = `${monthStr}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${monthStr}-${String(lastDay).padStart(2, "0")}`;

  const { data: expenses } = await supabase
    .from("grocery_expenses")
    .select("*")
    .eq("household_id", ctx.household.id)
    .gte("spent_at", start)
    .lte("spent_at", end)
    .order("spent_at", { ascending: false });

  const { data: lists } = await supabase
    .from("shopping_lists")
    .select("id, name")
    .eq("household_id", ctx.household.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const total = (expenses ?? []).reduce((s, e) => s + e.amount_cents, 0);
  const budget = ctx.household.monthly_budget_cents;

  const prev = new Date(y, m - 2, 1);
  const next = new Date(y, m, 1);
  const prevParam = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const nextParam = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Budget
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Log grocery trips and track spending against your monthly target.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <a
            href={`/budget?month=${prevParam}`}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Previous month
          </a>
          <a
            href={`/budget?month=${nextParam}`}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Next month
          </a>
        </div>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {new Date(y, m - 1, 1).toLocaleString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Monthly target
        </h2>
        <BudgetTargetForm
          householdId={ctx.household.id}
          monthlyBudgetCents={ctx.household.monthly_budget_cents}
        />
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Summary</h2>
        <p className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {formatCents(total)} spent
          {budget != null ? (
            <span className="text-lg font-normal text-zinc-600 dark:text-zinc-400">
              {" "}
              of {formatCents(budget)}
            </span>
          ) : null}
        </p>
        {budget != null && budget > 0 ? (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.min(100, (total / budget) * 100)}%` }}
            />
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Log expense
        </h2>
        <ExpenseForm
          defaultDate={new Date().toISOString().slice(0, 10)}
          lists={(lists ?? []) as Pick<ShoppingList, "id" | "name">[]}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Expenses this month
        </h2>
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {(expenses ?? []).length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No expenses logged for this month.
            </li>
          ) : (
            (expenses ?? []).map((e) => (
              <ExpenseRow key={e.id} expense={e as GroceryExpense} />
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
