import { createClient } from "@/lib/supabase/server";
import { getPrimaryHousehold } from "@/lib/household";
import type { Recipe, RecipeIngredient } from "@/types/database";
import { notFound, redirect } from "next/navigation";
import { RecipeEditor } from "../recipe-editor";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) redirect("/onboarding");

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .eq("household_id", ctx.household.id)
    .single();

  if (!recipe) notFound();

  const { data: ingredients } = await supabase
    .from("recipe_ingredients")
    .select("*")
    .eq("recipe_id", id)
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Edit recipe
        </h1>
      </div>
      <RecipeEditor
        recipe={recipe as Recipe}
        ingredients={(ingredients ?? []) as RecipeIngredient[]}
      />
    </div>
  );
}
