import { NewRecipeWithImport } from "../new-recipe-with-import";

export default function NewRecipePage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          New recipe
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Import from a link when the page publishes structured recipe data, or add
          everything by hand. Ingredient amounts are for the full batch; set total
          servings the recipe makes. On the meal plan you choose portions, and
          shopping lists scale by portions ÷ servings. Optional:{" "}
          <strong className="font-medium text-zinc-800 dark:text-zinc-200">
            Estimate (USDA)
          </strong>{" "}
          on ingredients (set{" "}
          <code className="rounded bg-zinc-100 px-1 text-sm dark:bg-zinc-800">
            USDA_FDC_API_KEY
          </code>
          ).
        </p>
      </div>
      <NewRecipeWithImport />
    </div>
  );
}
