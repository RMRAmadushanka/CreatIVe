import { authorizedFetch } from "@/lib/api-client";
import { API_BASE_URL, API_ENDPOINTS } from "@/constants/api";
import type { PayHereCheckout, Plan, PlanChangeKind, Subscription } from "@/types/billing.types";

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    let message = `Request failed (${res.status} ${res.statusText})`;
    if (detail) {
      try {
        const json = JSON.parse(detail) as { message?: string; code?: string };
        message = json.message || detail;
      } catch {
        message = `${message}: ${detail}`;
      }
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export async function listPlans(): Promise<Plan[]> {
  const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.billingPlans}`);
  return parseOrThrow<Plan[]>(res);
}

export async function getMySubscription(): Promise<Subscription> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.billingMe}`, {
    requireAuth: true,
  });
  return parseOrThrow<Subscription>(res);
}

/** Pay now — upgrades and renewals only. */
export async function createCheckout(planId: string): Promise<PayHereCheckout> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.billingCheckout}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      planId,
      frontendOrigin: typeof window !== "undefined" ? window.location.origin : undefined,
    }),
    requireAuth: true,
  });
  return parseOrThrow<PayHereCheckout>(res);
}

/** Schedule downgrade / Free at period end (no payment). */
export async function schedulePlanChange(planId: string): Promise<Subscription> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.billingScheduleChange}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId }),
    requireAuth: true,
  });
  return parseOrThrow<Subscription>(res);
}

export async function cancelSubscription(): Promise<Subscription> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.billingCancel}`, {
    method: "POST",
    requireAuth: true,
  });
  return parseOrThrow<Subscription>(res);
}

export async function resumeSubscription(): Promise<Subscription> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.billingResume}`, {
    method: "POST",
    requireAuth: true,
  });
  return parseOrThrow<Subscription>(res);
}

export function classifyPlanChange(current: Plan, target: Plan): PlanChangeKind {
  if (current.id === target.id) return "renew";
  if (target.priceLkr > current.priceLkr) return "upgrade";
  if (target.priceLkr < current.priceLkr) return "downgrade";
  return "upgrade";
}

type PayHereJs = {
  onCompleted: ((orderId: string) => void) | null;
  onDismissed: (() => void) | null;
  onError: ((error: string) => void) | null;
  startPayment: (payment: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    payhere?: PayHereJs;
  }
}

function loadPayHereScript(): Promise<PayHereJs> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PayHere checkout requires a browser"));
  }
  if (window.payhere) {
    return Promise.resolve(window.payhere);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-payhere="sdk"]');
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.payhere) resolve(window.payhere);
        else reject(new Error("PayHere SDK failed to initialize"));
      });
      existing.addEventListener("error", () => reject(new Error("Failed to load PayHere SDK")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.payhere.lk/lib/payhere.js";
    script.async = true;
    script.dataset.payhere = "sdk";
    script.onload = () => {
      if (window.payhere) resolve(window.payhere);
      else reject(new Error("PayHere SDK failed to initialize"));
    };
    script.onerror = () => reject(new Error("Failed to load PayHere SDK"));
    document.head.appendChild(script);
  });
}

/**
 * Opens PayHere onsite checkout (popup). Uses sandbox mode when backend says so.
 * For JS SDK, return_url / cancel_url must be undefined — notify_url activates the plan.
 */
export async function submitPayHereCheckout(payload: PayHereCheckout): Promise<void> {
  const payhere = await loadPayHereScript();
  const sandbox = payload.sandbox ?? payload.checkoutUrl.includes("sandbox.payhere.lk");

  return new Promise((resolve, reject) => {
    payhere.onCompleted = (orderId: string) => {
      const origin = window.location.origin;
      window.location.assign(
        `${origin}/dashboard/billing?status=success&order=${encodeURIComponent(orderId)}`,
      );
      resolve();
    };
    payhere.onDismissed = () => {
      resolve();
    };
    payhere.onError = (error: string) => {
      reject(new Error(error || "PayHere payment failed"));
    };

    payhere.startPayment({
      sandbox,
      merchant_id: payload.merchantId,
      // Required by PayHere JS SDK: must be undefined (not empty string)
      return_url: undefined,
      cancel_url: undefined,
      notify_url: payload.notifyUrl,
      order_id: payload.orderId,
      items: payload.items,
      amount: payload.amount,
      currency: payload.currency,
      hash: payload.hash,
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      city: payload.city,
      country: payload.country,
      custom_1: payload.custom1,
      custom_2: payload.custom2,
    });
  });
}

export function formatLimit(n: number): string {
  return n < 0 ? "Unlimited" : String(n);
}

export function formatPriceLkr(price: number): string {
  if (price <= 0) return "Free";
  return `LKR ${price.toLocaleString("en-LK")}/mo`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
