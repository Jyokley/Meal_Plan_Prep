import type { SupabaseClient } from "@supabase/supabase-js";
import type { Household, HouseholdMember } from "@/types/database";

export type HouseholdContext = {
  household: Household;
  membership: HouseholdMember;
};

function parseHouseholdContextRpc(data: unknown): HouseholdContext | null {
  if (data == null || typeof data !== "object" || Array.isArray(data)) return null;
  const root = data as Record<string, unknown>;
  const m = root.membership;
  const h = root.household;
  if (!m || !h || typeof m !== "object" || typeof h !== "object") return null;
  const membership = m as Record<string, unknown>;
  const household = h as Record<string, unknown>;
  const role = membership.role;
  if (role !== "owner" && role !== "member") return null;
  if (
    typeof membership.id !== "string" ||
    typeof membership.household_id !== "string" ||
    typeof membership.user_id !== "string" ||
    typeof household.id !== "string" ||
    typeof household.name !== "string" ||
    typeof household.invite_code !== "string" ||
    typeof household.created_at !== "string"
  ) {
    return null;
  }
  const budget = household.monthly_budget_cents;
  if (budget != null && typeof budget !== "number") return null;

  return {
    household: {
      id: household.id,
      name: household.name,
      invite_code: household.invite_code,
      monthly_budget_cents: budget ?? null,
      created_at: household.created_at,
    },
    membership: {
      id: membership.id,
      household_id: membership.household_id,
      user_id: membership.user_id,
      role,
    },
  };
}

/** Server and client: uses security definer RPC so RLS cannot block this read. */
export async function getPrimaryHousehold(
  supabase: SupabaseClient,
): Promise<HouseholdContext | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const {
    data: { user: userFromJwt },
  } = await supabase.auth.getUser();
  const user = userFromJwt ?? session?.user ?? null;
  if (!user) return null;

  const { data, error } = await supabase.rpc("get_my_primary_household_context");
  if (error) return null;

  return parseHouseholdContextRpc(data);
}

/** Same data as getPrimaryHousehold; exposes Supabase error for UI messages. */
export async function fetchPrimaryHouseholdWithError(supabase: SupabaseClient): Promise<{
  ctx: HouseholdContext | null;
  error: Error | null;
}> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const {
    data: { user: userFromJwt },
  } = await supabase.auth.getUser();
  const user = userFromJwt ?? session?.user ?? null;
  if (!user) {
    return { ctx: null, error: null };
  }

  const { data, error } = await supabase.rpc("get_my_primary_household_context");
  if (error) {
    return { ctx: null, error: new Error(error.message) };
  }
  return { ctx: parseHouseholdContextRpc(data), error: null };
}
