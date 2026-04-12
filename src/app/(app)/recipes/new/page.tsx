import { RecipeEditor } from "../recipe-editor";

export default function NewRecipePage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          New recipe
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Amounts are for the whole recipe; the meal planner scales them with your
          serving multiplier.
        </p>
      </div>
      <RecipeEditor />
    </div>
  );
}
