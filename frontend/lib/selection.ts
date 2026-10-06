"use client";
import { useState } from "react";
export function useUrlSelection(key: string, initial: string) {
  const [value, setValue] = useState(initial);
  function select(next: string) {
    setValue(next);
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete(key);
    else url.searchParams.set(key, next);
    window.history.replaceState(null, "", url.toString());
  }
  return [value, select] as const;
}
