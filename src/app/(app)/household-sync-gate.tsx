"use client";

import { fetchPrimaryHouseholdWithError } from "@/lib/household";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HOUSEHOLD_RESYNC_SESSION_KEY } from "./clear-resync-flag";

/**
 * When the server layout cannot see the session/household yet, the browser client
 * often still can. We verify membership here and either hard-reload once (to sync
 * cookies) or send the user to onboarding.
 */
export function HouseholdSyncGate() {
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.assign("/onboarding");
        return;
      }

      const { ctx, error } = await fetchPrimaryHouseholdWithError(supabase);

      if (cancelled) return;

      if (error) {
        setHint(
          `Could not load household (${error.message}). If you just deployed, run pending Supabase migrations (includes get_my_primary_household_context).`,
        );
        return;
      }

      if (!ctx) {
        window.location.assign("/onboarding");
        return;
      }

      const tried = sessionStorage.getItem(HOUSEHOLD_RESYNC_SESSION_KEY) === "1";
      if (!tried) {
        try {
          sessionStorage.setItem(HOUSEHOLD_RESYNC_SESSION_KEY, "1");
        } catch {
          /* ignore */
        }
        window.location.reload();
        return;
      }

      setHint(
        "Your account has a household, but the server still cannot load it. Try clearing site data for this origin or check Supabase logs.",
      );
      return;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading your household…</p>
      {hint ? (
        <div className="mt-4 max-w-md space-y-3 text-center">
          <p className="text-sm text-amber-800 dark:text-amber-200">{hint}</p>
          <Link
            href="/onboarding"
            className="text-sm font-medium text-emerald-600 underline dark:text-emerald-400"
          >
            Back to household setup
          </Link>
        </div>
      ) : null}
    </div>
  );
}
