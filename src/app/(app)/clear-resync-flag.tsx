"use client";

import { useEffect } from "react";

export const HOUSEHOLD_RESYNC_SESSION_KEY = "mealplan_hh_resync";

/** Cleared when the real app shell loads so a future desync can try one reload again. */
export function ClearHouseholdResyncFlag() {
  useEffect(() => {
    try {
      sessionStorage.removeItem(HOUSEHOLD_RESYNC_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
