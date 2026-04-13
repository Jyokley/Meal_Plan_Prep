-- Fix RLS so users can read their own membership row without a self-referential
-- EXISTS (which can fail under RLS when the inner scan cannot "see" the new row yet).

drop policy if exists "household_members_select_member" on public.household_members;

-- Always allow reading your own membership rows (no subquery on this table).
create policy "household_members_select_self"
  on public.household_members for select
  using (user_id = auth.uid());

-- Allow reading other members in households you belong to. The subquery only
-- selects rows where user_id = auth.uid(), which are allowed by select_self.
create policy "household_members_select_by_household"
  on public.household_members for select
  using (
    household_id in (
      select m.household_id
      from public.household_members as m
      where m.user_id = auth.uid()
    )
  );
