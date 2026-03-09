"use client";

import useSWR, { type SWRConfiguration } from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch error ${res.status}`);
  return res.json();
};

/**
 * Thin wrapper around SWR with project defaults.
 * Deduplicates requests, caches between navigations, and revalidates on focus.
 */
export function useSwrFetch<T = unknown>(
  key: string | null,
  options?: SWRConfiguration
) {
  return useSWR<T>(key, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
    errorRetryCount: 2,
    keepPreviousData: true,
    ...options,
  });
}
