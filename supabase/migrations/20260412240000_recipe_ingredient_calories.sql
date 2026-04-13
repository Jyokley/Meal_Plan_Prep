alter table public.recipe_ingredients
  add column if not exists calories_kcal numeric
  check (calories_kcal is null or calories_kcal >= 0);

comment on column public.recipe_ingredients.calories_kcal is
  'Kilocalories for this ingredient line as written in the full recipe (sum of lines ≈ whole recipe).';
