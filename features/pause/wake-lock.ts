"use client";

/**
 * Screen wake lock — keeps the display on during a breath session so the
 * pacer never throttles into the background. Silently does nothing where
 * the API is missing or denied (e.g. iOS lock screen, low battery).
 */

type Sentinel = { release: () => Promise<void> };

let wanted = false;
let sentinel: Sentinel | null = null;

type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<Sentinel> };
};

async function request(): Promise<void> {
  const nav = navigator as WakeLockNavigator;
  if (!nav.wakeLock) return;
  try {
    sentinel = await nav.wakeLock.request("screen");
  } catch {
    // Denied (low battery, tab hidden) — pacing still works, just dims.
  }
}

export async function acquireWakeLock(): Promise<void> {
  wanted = true;
  await request();
}

export async function releaseWakeLock(): Promise<void> {
  wanted = false;
  try {
    await sentinel?.release();
  } catch {
    // Already released by the OS.
  }
  sentinel = null;
}

// The OS drops the lock when the tab hides — take it back on return.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (wanted && document.visibilityState === "visible") void request();
  });
}
