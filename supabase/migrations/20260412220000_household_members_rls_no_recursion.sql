-- Policies that subquery household_members under RLS cause
-- "infinite recursion detected in policy for relation household_members".
-- Helpers run as definer and filter by auth.uid() only.

create or replace function public.user_household_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select hm.household_id
  from public.household_members hm
  where hm.user_id = auth.uid();
$$;

create or replace function public.user_owner_household_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select hm.household_id
  from public.household_members hm
  where hm.user_id = auth.uid()
    and hm.role = 'owner';
$$;

revoke all on function public.user_household_ids() from public;
revoke all on function public.user_owner_household_ids() from public;
grant execute on function public.user_household_ids() to authenticated;
grant execute on function public.user_household_ids() to anon;
grant execute on function public.user_owner_household_ids() to authenticated;
grant execute on function public.user_owner_household_ids() to anon;

drop policy if exists "household_members_select_by_household" on public.household_members;

create policy "household_members_select_by_household"
  on public.household_members for select
  using (household_id in (select public.user_household_ids()));

drop policy if exists "household_members_delete_owner" on public.household_members;

create policy "household_members_delete_owner"
  on public.household_members for delete
  using (household_id in (select public.user_owner_household_ids()));
