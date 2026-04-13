-- Load primary household context without relying on RLS for SELECT on
-- household_members / households (avoids policy gaps and PostgREST errors).

create or replace function public.get_my_primary_household_context()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'membership', jsonb_build_object(
      'id', hm.id,
      'household_id', hm.household_id,
      'user_id', hm.user_id,
      'role', hm.role
    ),
    'household', jsonb_build_object(
      'id', h.id,
      'name', h.name,
      'invite_code', h.invite_code,
      'monthly_budget_cents', h.monthly_budget_cents,
      'created_at', h.created_at
    )
  )
  from public.household_members hm
  inner join public.households h on h.id = hm.household_id
  where hm.user_id = auth.uid()
  order by hm.created_at asc
  limit 1;
$$;

revoke all on function public.get_my_primary_household_context() from public;
grant execute on function public.get_my_primary_household_context() to authenticated;
grant execute on function public.get_my_primary_household_context() to anon;
