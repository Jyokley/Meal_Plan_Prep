"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createHouseholdAction(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_household", {
    p_name: name,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  revalidatePath("/onboarding");
}

export async function joinHouseholdAction(code: string) {
  const trimmed = code.trim();
  if (!trimmed) throw new Error("Invite code is required");

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_household_by_code", {
    p_code: trimmed,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  revalidatePath("/onboarding");
}

export async function rotateInviteAction(householdId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rotate_household_invite", {
    p_household_id: householdId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  return data as string;
}

export async function rotateInviteForCurrentHouseholdAction() {
  const { getPrimaryHousehold } = await import("@/lib/household");
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx || ctx.membership.role !== "owner") {
    throw new Error("Only owners can rotate the invite code");
  }
  await rotateInviteAction(ctx.household.id);
}

export async function updateHouseholdBudgetAction(
  householdId: string,
  monthlyBudgetCents: number | null,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_household_monthly_budget", {
    p_household_id: householdId,
    p_cents: monthlyBudgetCents,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
