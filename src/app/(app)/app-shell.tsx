import { signOutAction } from "@/app/actions/household";
import type { HouseholdContext } from "@/lib/household";
import Link from "next/link";
import { ClearHouseholdResyncFlag } from "./clear-resync-flag";

const nav = [
  { href: "/", label: "Home" },
  { href: "/recipes", label: "Recipes" },
  { href: "/plan", label: "Meal plan" },
  { href: "/lists", label: "Shopping" },
  { href: "/budget", label: "Budget" },
];

export function AppShell({
  ctx,
  children,
}: {
  ctx: HouseholdContext;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <ClearHouseholdResyncFlag />
      <aside className="border-b border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 md:w-52 md:border-b-0 md:border-r md:py-8">
        <div className="mb-6">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Meal Plan Prep
          </Link>
          <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {ctx.household.name}
          </p>
        </div>
        <nav className="flex flex-wrap gap-2 md:flex-col md:gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200/80 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={signOutAction} className="mt-8 hidden md:block">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
          >
            Sign out
          </button>
        </form>
      </aside>
      <main className="flex flex-1 flex-col px-4 py-6 md:px-8 md:py-10">
        {children}
        <form action={signOutAction} className="mt-auto border-t border-zinc-200 pt-6 md:hidden dark:border-zinc-800">
          <button type="submit" className="text-sm text-zinc-500 dark:text-zinc-400">
            Sign out
          </button>
        </form>
      </main>
    </div>
  );
}
