import { createClient } from "@/lib/supabase/server";
import { getPrimaryHousehold } from "@/lib/household";
import { redirect } from "next/navigation";
import { OnboardingForms } from "./ui";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const existing = await getPrimaryHousehold(supabase);
  if (existing) redirect("/");

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Join your household
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Create a new household or enter an invite code from your partner.
        </p>
        <OnboardingForms />
      </div>
    </div>
  );
}
