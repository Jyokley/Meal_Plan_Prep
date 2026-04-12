import type { SupabaseClient } from "@supabase/supabase-js";
import type { Household, HouseholdMember } from "@/types/database";

export type HouseholdContext = {
  household: Household;
  membership: HouseholdMember;
};

export async function getPrimaryHousehold(
  supabase: SupabaseClient,
): Promise<HouseholdContext | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows, error } = await supabase
    .from("household_members")
    .select(
      `
      id,
      household_id,
      user_id,
      role,
      households (
        id,
        name,
        invite_code,
        monthly_budget_cents,
        created_at
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error || !rows?.length) return null;

  const raw = rows[0] as unknown as {
    id: string;
    household_id: string;
    user_id: string;
    role: "owner" | "member";
    households: Household | Household[] | null;
  };

  const h = raw.households;
  const household = Array.isArray(h) ? h[0] : h;
  if (!household) return null;

  return {
    household,
    membership: {
      id: raw.id,
      household_id: raw.household_id,
      user_id: raw.user_id,
      role: raw.role,
    },
  };
}
