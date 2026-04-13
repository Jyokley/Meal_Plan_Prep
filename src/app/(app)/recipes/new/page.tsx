import { RecipeEditor } from "../recipe-editor";

export default function NewRecipePage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          New recipe
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Ingredient amounts are for the full batch. Set total servings the recipe
          makes; on the meal plan you enter how many portions you need, and shopping
          lists scale amounts by portions ÷ recipe servings.
        </p>
      </div>
      <RecipeEditor />
    </div>
  );
}
