"use server";

import { createClient } from "@/lib/supabase/server";
import { getPrimaryHousehold } from "@/lib/household";
import { revalidatePath } from "next/cache";

export async function addGroceryExpenseAction(input: {
  amountCents: number;
  spentAt: string;
  storeName?: string;
  notes?: string;
  shoppingListId?: string | null;
}) {
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) throw new Error("No household");

  if (input.amountCents < 0) throw new Error("Amount must be positive");

  const { error } = await supabase.from("grocery_expenses").insert({
    household_id: ctx.household.id,
    amount_cents: input.amountCents,
    spent_at: input.spentAt,
    store_name: input.storeName?.trim() || null,
    notes: input.notes?.trim() || null,
    shopping_list_id: input.shoppingListId || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function deleteGroceryExpenseAction(id: string) {
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) throw new Error("No household");

  const { error } = await supabase
    .from("grocery_expenses")
    .delete()
    .eq("id", id)
    .eq("household_id", ctx.household.id);

  if (error) throw new Error(error.message);
  revalidatePath("/budget");
  revalidatePath("/");
}
