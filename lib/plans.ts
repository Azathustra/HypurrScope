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
    key: "theses_monthly",
    plan: "member" as PlanKey,
    name: "Theses",
    price: "49 EUR",
    cadence: "par mois",
    description: "Acces a nos theses d'investissement.",
    stripePriceEnv: "STRIPE_PRICE_THESES_MONTHLY",
    highlight: false,
    features: ["Theses d'investissement", "Notes research", "Research", "Archives membres"]
  },
  {
    key: "portfolio_alerts_monthly",
    plan: "pro" as PlanKey,
    name: "Portefeuille & alertes",
    price: "99 EUR",
    cadence: "par mois",
    description: "Acces au portefeuille modele et aux alertes.",
    stripePriceEnv: "STRIPE_PRICE_PORTFOLIO_ALERTS_MONTHLY",
    highlight: true,
    features: ["Tout l'acces theses", "Portefeuille modele", "Alertes marche", "Suivi des mouvements"]
  },
  {
    key: "portfolio_alerts_yearly",
    plan: "pro" as PlanKey,
    name: "Annuel",
    price: "944 EUR",
    cadence: "par an",
    description: "20% de reduction par rapport a l'abonnement mensuel.",
    stripePriceEnv: "STRIPE_PRICE_PORTFOLIO_ALERTS_YEARLY",
    highlight: false,
    features: ["Portefeuille & alertes", "12 mois d'acces", "20% de reduction", "Priorite sur les mises a jour"]
  }
];

export const pricingFeatures = pricingPlans[1].features;

export function canAccess(requiredPlan: PlanKey, userPlan: PlanKey) {
  return planRank[userPlan] >= planRank[requiredPlan];
}
