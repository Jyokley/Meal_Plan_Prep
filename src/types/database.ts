export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export type Household = {
  id: string;
  name: string;
  invite_code: string;
  monthly_budget_cents: number | null;
  created_at: string;
};

export type HouseholdMember = {
  id: string;
  household_id: string;
  user_id: string;
  role: "owner" | "member";
};

export type Recipe = {
  id: string;
  household_id: string;
  title: string;
  instructions: string;
  servings: number;
  source_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RecipeIngredient = {
  id: string;
  recipe_id: string;
  sort_order: number;
  amount: number | null;
  unit: string;
  name: string;
  notes: string | null;
};

export type PlannedMeal = {
  id: string;
  household_id: string;
  meal_plan_id: string | null;
  plan_date: string;
  meal_slot: MealSlot;
  recipe_id: string;
  servings_multiplier: number;
  created_at: string;
};

export type ShoppingList = {
  id: string;
  household_id: string;
  name: string;
  generated_from_start: string | null;
  generated_from_end: string | null;
  created_at: string;
};

export type ShoppingListItem = {
  id: string;
  list_id: string;
  display_text: string | null;
  amount: number | null;
  unit: string;
  name: string;
  checked: boolean;
  sort_order: number;
  category: string | null;
};

export type GroceryExpense = {
  id: string;
  household_id: string;
  amount_cents: number;
  spent_at: string;
  store_name: string | null;
  notes: string | null;
  shopping_list_id: string | null;
  created_at: string;
};
