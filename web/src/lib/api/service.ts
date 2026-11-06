"use client";

// One shared, client-side view of the prediction service, so the masthead, the studio and the
// player profiles never disagree. /api/health sets it (verified against the research registry);
// a prediction call that fails because the service is unavailable marks it offline at once.

import { useSyncExternalStore } from "react";
import type { ServiceState } from "./verify";

export interface ServiceStatus {
  state: ServiceState;
  reason: string;
}

const INITIAL: ServiceStatus = { state: "checking", reason: "Checking the prediction API." };
let current: ServiceStatus = INITIAL;
const listeners = new Set<() => void>();

export function setServiceStatus(next: ServiceStatus): void {
  if (next.state === current.state && next.reason === current.reason) return;
  current = next;
  listeners.forEach((l) => l());
}

export function getServiceStatus(): ServiceStatus {
  return current;
}

export function useServiceStatus(): ServiceStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => INITIAL,
  );
}

/** Ask /api/health for a verdict and publish it. Never throws. */
export async function checkService(fetchImpl: typeof fetch = fetch): Promise<ServiceStatus> {
  let next: ServiceStatus;
  try {
    const res = await fetchImpl("/api/health", { cache: "no-store" });
    const body = (await res.json().catch(() => null)) as { service?: ServiceStatus } | null;
    next = body?.service?.state ? { state: body.service.state, reason: body.service.reason } : { state: "offline", reason: "The health check gave no verdict." };
  } catch {
    next = { state: "offline", reason: "Couldn't reach FairValue's health check." };
  }
  setServiceStatus(next);
  return next;
}

/** For tests: forget the last verdict. */
export function resetServiceStatus(): void {
  current = INITIAL;
  listeners.forEach((l) => l());
}

export const SERVICE_LABEL: Record<ServiceState, string> = {
  checking: "Checking model",
  online: "Model online",
  unverified: "Model unverified",
  offline: "Model offline",
};
