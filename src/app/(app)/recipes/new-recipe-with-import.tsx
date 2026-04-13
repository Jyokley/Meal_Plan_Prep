"use client";

import type { ImportedRecipeDraft } from "@/lib/recipe-jsonld";
import { useState } from "react";
import { RecipeEditor } from "./recipe-editor";
import { RecipeUrlImportCard } from "./recipe-url-import";

export function NewRecipeWithImport() {
  const [editorKey, setEditorKey] = useState(0);
  const [prefill, setPrefill] = useState<ImportedRecipeDraft | null>(null);

  return (
    <div className="space-y-8">
      <RecipeUrlImportCard
        onImported={(draft) => {
          setPrefill(draft);
          setEditorKey((k) => k + 1);
        }}
      />
      <RecipeEditor key={editorKey} prefill={prefill ?? undefined} />
    </div>
  );
}
