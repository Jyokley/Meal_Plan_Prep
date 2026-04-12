-- Allow any household member to set monthly budget (RLS keeps household row updates owner-only)

create or replace function public.set_household_monthly_budget(
  p_household_id uuid,
  p_cents integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not exists (
    select 1 from public.household_members
    where household_id = p_household_id and user_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;
  if p_cents is not null and p_cents < 0 then
    raise exception 'invalid amount';
  end if;
  update public.households
  set monthly_budget_cents = p_cents
  where id = p_household_id;
end;
$$;

grant execute on function public.set_household_monthly_budget(uuid, integer) to authenticated;
