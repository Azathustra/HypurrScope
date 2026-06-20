export type PlanKey = "free" | "member" | "pro" | "desk";

export const planRank: Record<PlanKey, number> = {
  free: 0,
  member: 1,
  pro: 2,
  desk: 3
};

export const activeStripeStatuses = ["active", "trialing"] as const;

export const pricingPlans = [
  {
    key: "member_monthly",
    plan: "member" as PlanKey,
    name: "Mensuel",
    price: "49 €",
    cadence: "par mois",
    stripePriceEnv: "STRIPE_PRICE_MEMBER_MONTHLY",
    highlight: false
  },
  {
    key: "member_yearly",
    plan: "pro" as PlanKey,
    name: "Annuel",
    price: "399 €",
    cadence: "par an",
    stripePriceEnv: "STRIPE_PRICE_MEMBER_YEARLY",
    highlight: true
  },
  {
    key: "desk",
    plan: "desk" as PlanKey,
    name: "Desk",
    price: "990 €",
    cadence: "par an ou sur demande",
    stripePriceEnv: "STRIPE_PRICE_DESK_YEARLY",
    highlight: false
  }
];

export const pricingFeatures = [
  "Accès terminal",
  "Research premium",
  "Alpha feed",
  "Portefeuilles modèles",
  "Rapports longs",
  "Formations",
  "Support communauté"
];

export function canAccess(requiredPlan: PlanKey, userPlan: PlanKey) {
  return planRank[userPlan] >= planRank[requiredPlan];
}
