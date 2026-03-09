"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the document is visible (tab is active).
 * Used to pause polling when the user switches tabs.
 */
export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    function handleChange() {
      setVisible(document.visibilityState === "visible");
    }
    document.addEventListener("visibilitychange", handleChange);
    return () => document.removeEventListener("visibilitychange", handleChange);
  }, []);

  return visible;
}
