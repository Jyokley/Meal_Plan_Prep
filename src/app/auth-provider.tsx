"use client";

import { createClient } from "@/lib/supabase/client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const AuthReadyContext = createContext(false);

export function useAuthReady() {
  return useContext(AuthReadyContext);
}

/**
 * No email login: creates a Supabase anonymous session so RLS (auth.uid()) works.
 * Enable "Anonymous sign-ins" in Supabase → Authentication → Providers.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          if (!cancelled) {
            setBootstrapError(
              error.message.includes("Anonymous sign-ins are disabled")
                ? "Turn on Anonymous sign-ins in the Supabase dashboard (Authentication → Sign In / Providers)."
                : error.message,
            );
          }
          return;
        }
        // Full reload so the next request sends fresh auth cookies to Server
        // Components / Actions (router.refresh alone is often not enough).
        if (!cancelled) window.location.reload();
        return;
      }
      if (!cancelled) setAuthReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (bootstrapError) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          <p className="font-medium">Could not start a session</p>
          <p className="mt-2">{bootstrapError}</p>
        </div>
      </div>
    );
  }

  return (
    <AuthReadyContext.Provider value={authReady}>
      {children}
    </AuthReadyContext.Provider>
  );
}
