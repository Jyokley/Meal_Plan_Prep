"use client";

import { fetchRecipeFromUrlAction } from "@/app/actions/recipe-import";
import type { ImportedRecipeDraft } from "@/lib/recipe-jsonld";
import { useState } from "react";

export function RecipeUrlImportCard({
  onImported,
}: {
  onImported: (draft: ImportedRecipeDraft) => void;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onImport(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetchRecipeFromUrlAction(url);
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      onImported(res.draft);
      setMessage("Loaded — review and save below.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
        Import from link
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Paste a recipe URL. We read{" "}
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          JSON-LD
        </span>{" "}
        (Schema.org) when the site provides it — no scraping fee, but not every
        blog supports it.
      </p>
      <form onSubmit={onImport} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          name="recipe-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="min-h-[44px] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-emerald-500/40 focus:border-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="min-h-[44px] shrink-0 rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {busy ? "Fetching…" : "Import"}
        </button>
      </form>
      {message ? (
        <p
          className={`mt-3 text-sm ${
            message.startsWith("Loaded")
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
