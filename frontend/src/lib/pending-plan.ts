const STORAGE_KEY = "creative:pending-plan";

const ALLOWED = new Set(["free", "pro", "business"]);

export function setPendingPlan(planId: string): void {
  const id = planId.trim().toLowerCase();
  if (!ALLOWED.has(id) || typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, id);
}

export function getPendingPlan(): string | null {
  if (typeof window === "undefined") return null;
  const id = window.localStorage.getItem(STORAGE_KEY);
  if (!id || !ALLOWED.has(id)) return null;
  return id;
}

export function clearPendingPlan(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function isPaidPlanId(planId: string | null | undefined): boolean {
  return planId === "pro" || planId === "business";
}
