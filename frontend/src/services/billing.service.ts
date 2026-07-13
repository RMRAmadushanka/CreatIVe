import { authorizedFetch } from "@/lib/api-client";
import { API_BASE_URL, API_ENDPOINTS } from "@/constants/api";
import type { PayHereCheckout, Plan, Subscription } from "@/types/billing.types";

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Request failed (${res.status} ${res.statusText})${detail ? `: ${detail}` : ""}`,
    );
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

export async function createCheckout(planId: string): Promise<PayHereCheckout> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.billingCheckout}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId }),
    requireAuth: true,
  });
  return parseOrThrow<PayHereCheckout>(res);
}

export async function cancelSubscription(): Promise<Subscription> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.billingCancel}`, {
    method: "POST",
    requireAuth: true,
  });
  return parseOrThrow<Subscription>(res);
}

/** Submit a PayHere checkout form (browser redirect). */
export function submitPayHereCheckout(payload: PayHereCheckout): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = payload.checkoutUrl;

  const fields: Record<string, string> = {
    merchant_id: payload.merchantId,
    return_url: payload.returnUrl,
    cancel_url: payload.cancelUrl,
    notify_url: payload.notifyUrl,
    order_id: payload.orderId,
    items: payload.items,
    currency: payload.currency,
    amount: payload.amount,
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
  };

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

export function formatLimit(n: number): string {
  return n < 0 ? "Unlimited" : String(n);
}

export function formatPriceLkr(price: number): string {
  if (price <= 0) return "Free";
  return `LKR ${price.toLocaleString("en-LK")}/mo`;
}
