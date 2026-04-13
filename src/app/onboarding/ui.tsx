"use client";

import { useAuthReady } from "@/app/auth-provider";
import { createHouseholdAction, joinHouseholdAction } from "@/app/actions/household";
import { useState } from "react";

export function OnboardingForms() {
  const authReady = useAuthReady();
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [pending, setPending] = useState<"create" | "join" | null>(null);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);
    setPending("create");
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    try {
      await createHouseholdAction(name);
      window.location.assign("/");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(null);
    }
  }

  async function onJoin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setJoinError(null);
    setPending("join");
    const fd = new FormData(e.currentTarget);
    const code = String(fd.get("code") ?? "").trim();
    try {
      await joinHouseholdAction(code);
      window.location.assign("/");
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-8 space-y-10">
      {!authReady ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Connecting…</p>
      ) : null}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Create household
        </h2>
        <form onSubmit={onCreate} className="mt-3 space-y-3">
          <input
            name="name"
            required
            disabled={!authReady}
            placeholder="Household name"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-emerald-500/40 focus:border-emerald-500 focus:ring-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={!authReady || pending !== null}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending === "create" ? "Creating…" : "Create"}
          </button>
          {createError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>
          ) : null}
        </form>
      </section>

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            or
          </span>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Join with invite code
        </h2>
        <form onSubmit={onJoin} className="mt-3 space-y-3">
          <input
            name="code"
            required
            disabled={!authReady}
            placeholder="Invite code"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-zinc-900 outline-none ring-emerald-500/40 focus:border-emerald-500 focus:ring-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            autoCapitalize="characters"
          />
          <button
            type="submit"
            disabled={!authReady || pending !== null}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            {pending === "join" ? "Joining…" : "Join household"}
          </button>
          {joinError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{joinError}</p>
          ) : null}
        </form>
      </section>
    </div>
  );
}
