"use client";

import { HOUSEHOLD_RESYNC_SESSION_KEY } from "@/app/(app)/clear-resync-flag";
import { useEffect } from "react";

/** Visiting setup again should allow one more server resync attempt from `/`. */
export function ResetResyncFlagOnOnboarding() {
  useEffect(() => {
    try {
      sessionStorage.removeItem(HOUSEHOLD_RESYNC_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
