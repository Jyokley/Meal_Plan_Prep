-- Atomically replace next week's planned_meals with a +7 day copy of the source week.

create or replace function public.copy_planned_meals_to_next_week(
  p_household_id uuid,
  p_source_week_monday date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int;
  v_next_monday date := p_source_week_monday + 7;
  v_source_end date := p_source_week_monday + 6;
  v_target_end date := v_next_monday + 6;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.household_members m
    where m.household_id = p_household_id and m.user_id = auth.uid()
  ) then
    raise exception 'not a member of this household';
  end if;

  if not exists (
    select 1 from public.planned_meals pm
    where pm.household_id = p_household_id
      and pm.plan_date >= p_source_week_monday
      and pm.plan_date <= v_source_end
  ) then
    return 0;
  end if;

  delete from public.planned_meals pm
  where pm.household_id = p_household_id
    and pm.plan_date >= v_next_monday
    and pm.plan_date <= v_target_end;

  insert into public.planned_meals (
    household_id,
    meal_plan_id,
    plan_date,
    meal_slot,
    recipe_id,
    servings_multiplier
  )
  select
    p_household_id,
    null,
    pm.plan_date + 7,
    pm.meal_slot,
    pm.recipe_id,
    pm.servings_multiplier
  from public.planned_meals pm
  where pm.household_id = p_household_id
    and pm.plan_date >= p_source_week_monday
    and pm.plan_date <= v_source_end;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function public.copy_planned_meals_to_next_week(uuid, date) from public;
grant execute on function public.copy_planned_meals_to_next_week(uuid, date) to authenticated;
grant execute on function public.copy_planned_meals_to_next_week(uuid, date) to anon;
