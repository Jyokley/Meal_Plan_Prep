-- Meal planner schema: households, recipes, planning, shopping, budget
-- Run with Supabase CLI: supabase db push / link project

-- On Supabase, pgcrypto lives in schema "extensions"; qualify gen_random_bytes below.
create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Profiles (synced from auth)
-- -----------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Households & members
-- -----------------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default encode(extensions.gen_random_bytes(6), 'hex'),
  monthly_budget_cents integer check (monthly_budget_cents is null or monthly_budget_cents >= 0),
  created_at timestamptz not null default now()
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create index household_members_user_id_idx on public.household_members (user_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;

create policy "households_select_member"
  on public.households for select
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = households.id and hm.user_id = auth.uid()
    )
  );

create policy "households_update_owner"
  on public.households for update
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = households.id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );

create policy "household_members_select_member"
  on public.household_members for select
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
    )
  );

-- RPC: create household + owner membership (bypasses RLS)
create or replace function public.create_household(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.households (name) values (p_name) returning id into v_hid;
  insert into public.household_members (household_id, user_id, role)
  values (v_hid, auth.uid(), 'owner');
  return v_hid;
end;
$$;

-- RPC: join with invite code
create or replace function public.join_household_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select id into v_hid from public.households where invite_code = trim(p_code);
  if v_hid is null then
    raise exception 'invalid invite code';
  end if;
  if exists (
    select 1 from public.household_members
    where household_id = v_hid and user_id = auth.uid()
  ) then
    return v_hid;
  end if;
  insert into public.household_members (household_id, user_id, role)
  values (v_hid, auth.uid(), 'member');
  return v_hid;
end;
$$;

-- RPC: owner rotates invite code
create or replace function public.rotate_household_invite(p_household_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not exists (
    select 1 from public.household_members
    where household_id = p_household_id
      and user_id = auth.uid()
      and role = 'owner'
  ) then
    raise exception 'only owners can rotate invite code';
  end if;
  v_code := encode(extensions.gen_random_bytes(6), 'hex');
  update public.households set invite_code = v_code where id = p_household_id;
  return v_code;
end;
$$;

grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household_by_code(text) to authenticated;
grant execute on function public.rotate_household_invite(uuid) to authenticated;

-- Owners can remove members (not themselves if sole owner — app should guard)
create policy "household_members_delete_owner"
  on public.household_members for delete
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );

-- -----------------------------------------------------------------------------
-- Recipes
-- -----------------------------------------------------------------------------
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null,
  instructions text not null default '',
  servings numeric not null default 1 check (servings > 0),
  source_url text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  sort_order int not null default 0,
  amount numeric,
  unit text not null default '',
  name text not null,
  notes text
);

create index recipes_household_id_idx on public.recipes (household_id);
create index recipe_ingredients_recipe_id_idx on public.recipe_ingredients (recipe_id);

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

create policy "recipes_member_all"
  on public.recipes for all
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = recipes.household_id and hm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = recipes.household_id and hm.user_id = auth.uid()
    )
  );

create policy "recipe_ingredients_member_all"
  on public.recipe_ingredients for all
  using (
    exists (
      select 1 from public.recipes r
      join public.household_members hm on hm.household_id = r.household_id
      where r.id = recipe_ingredients.recipe_id and hm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      join public.household_members hm on hm.household_id = r.household_id
      where r.id = recipe_ingredients.recipe_id and hm.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- Meal plans & planned meals
-- -----------------------------------------------------------------------------
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  week_start date not null,
  label text,
  created_at timestamptz not null default now()
);

create table public.planned_meals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  meal_plan_id uuid references public.meal_plans (id) on delete set null,
  plan_date date not null,
  meal_slot text not null check (meal_slot in ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  servings_multiplier numeric not null default 1 check (servings_multiplier > 0),
  created_at timestamptz not null default now()
);

create index planned_meals_household_date_idx on public.planned_meals (household_id, plan_date);
create index meal_plans_household_idx on public.meal_plans (household_id);

alter table public.meal_plans enable row level security;
alter table public.planned_meals enable row level security;

create policy "meal_plans_member_all"
  on public.meal_plans for all
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = meal_plans.household_id and hm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = meal_plans.household_id and hm.user_id = auth.uid()
    )
  );

create policy "planned_meals_member_all"
  on public.planned_meals for all
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = planned_meals.household_id and hm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = planned_meals.household_id and hm.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- Shopping lists
-- -----------------------------------------------------------------------------
create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  generated_from_start date,
  generated_from_end date,
  created_at timestamptz not null default now()
);

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  display_text text,
  amount numeric,
  unit text not null default '',
  name text not null,
  checked boolean not null default false,
  sort_order int not null default 0,
  category text
);

create index shopping_lists_household_idx on public.shopping_lists (household_id);
create index shopping_list_items_list_idx on public.shopping_list_items (list_id);

alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;

create policy "shopping_lists_member_all"
  on public.shopping_lists for all
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = shopping_lists.household_id and hm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = shopping_lists.household_id and hm.user_id = auth.uid()
    )
  );

create policy "shopping_list_items_member_all"
  on public.shopping_list_items for all
  using (
    exists (
      select 1 from public.shopping_lists sl
      join public.household_members hm on hm.household_id = sl.household_id
      where sl.id = shopping_list_items.list_id and hm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.shopping_lists sl
      join public.household_members hm on hm.household_id = sl.household_id
      where sl.id = shopping_list_items.list_id and hm.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- Grocery expenses
-- -----------------------------------------------------------------------------
create table public.grocery_expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  spent_at date not null,
  store_name text,
  notes text,
  shopping_list_id uuid references public.shopping_lists (id) on delete set null,
  created_at timestamptz not null default now()
);

create index grocery_expenses_household_spent_idx on public.grocery_expenses (household_id, spent_at);

alter table public.grocery_expenses enable row level security;

create policy "grocery_expenses_member_all"
  on public.grocery_expenses for all
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = grocery_expenses.household_id and hm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = grocery_expenses.household_id and hm.user_id = auth.uid()
    )
  );
