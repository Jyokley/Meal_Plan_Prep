import { createClient } from "@/lib/supabase/server";
import { getPrimaryHousehold } from "@/lib/household";
import { unstable_noStore as noStore } from "next/cache";
import { AppShell } from "./app-shell";
import { HouseholdSyncGate } from "./household-sync-gate";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  noStore();

  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);

  if (ctx) {
    return <AppShell ctx={ctx}>{children}</AppShell>;
  }

  return <HouseholdSyncGate />;
}
