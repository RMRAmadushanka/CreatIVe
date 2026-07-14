export type Plan = {
  id: string;
  name: string;
  priceLkr: number;
  billingInterval: string;
  maxProjects: number;
  maxPagesPerProject: number;
  maxMediaUploadsMonth: number;
  builderComponents: string[];
  allBuilderComponents: boolean;
};

export type Subscription = {
  id: string;
  status: "active" | "past_due" | "cancelled" | "expired" | string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  payhereOrderId: string | null;
  plan: Plan;
  pendingPlan: Plan | null;
  gracePeriodEndsAt: string | null;
  changeHint: string | null;
  overLimitWarnings: string[];
  usage: {
    projectsUsed: number;
    mediaUploadsThisMonth: number;
    period: string;
  };
};

export type PayHereCheckout = {
  checkoutUrl: string;
  sandbox?: boolean;
  merchantId: string;
  orderId: string;
  items: string;
  currency: string;
  amount: string;
  hash: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  custom1: string;
  custom2: string;
};

export type PlanChangeKind = "upgrade" | "downgrade" | "renew" | "current";
