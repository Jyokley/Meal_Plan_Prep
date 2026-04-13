"use server";

import { createClient } from "@/lib/supabase/server";
import { getPrimaryHousehold } from "@/lib/household";
import {
  extractRecipeDraftFromHtml,
  type ImportedRecipeDraft,
} from "@/lib/recipe-jsonld";
import { redirect } from "next/navigation";

const MAX_BYTES = 2_000_000;
const FETCH_TIMEOUT_MS = 18_000;

function assertSafeHttpUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http and https links are allowed");
  }
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "[::]" ||
    host.endsWith(".local")
  ) {
    throw new Error("This URL cannot be imported");
  }
  return u;
}

export async function fetchRecipeFromUrlAction(
  url: string,
): Promise<
  { ok: true; draft: ImportedRecipeDraft } | { ok: false; message: string }
> {
  const supabase = await createClient();
  const ctx = await getPrimaryHousehold(supabase);
  if (!ctx) redirect("/onboarding");

  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, message: "Paste a recipe URL." };
  }

  let safeUrl: URL;
  try {
    safeUrl = assertSafeHttpUrl(trimmed);
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Invalid URL",
    };
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(safeUrl.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept:
          "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) {
      return {
        ok: false,
        message: `Could not load page (${res.status}). Try opening the link in your browser first.`,
      };
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return {
        ok: false,
        message: "Page is too large to import. Try a printable or mobile recipe URL.",
      };
    }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    const draft = extractRecipeDraftFromHtml(html, safeUrl.toString());
    if (!draft) {
      return {
        ok: false,
        message:
          "No recipe found in that page’s structured data (JSON-LD). Many blogs don’t publish it — try a site like NYT Cooking, Serious Eats, or King Arthur, or add the recipe by hand.",
      };
    }
    return { ok: true, draft };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, message: "Request timed out. Try again or another URL." };
    }
    return {
      ok: false,
      message:
        e instanceof Error
          ? e.message
          : "Could not fetch that URL. The site may block automated requests.",
    };
  } finally {
    clearTimeout(t);
  }
}
