import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PlanKey } from "@/lib/plans";

export type Viewer = {
  id: string | null;
  email: string | null;
  role: "guest" | "user" | "admin";
  plan: PlanKey;
  subscriptionStatus: string | null;
};

export async function getViewer(): Promise<Viewer> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      id: null,
      email: null,
      role: "guest",
      plan: "free",
      subscriptionStatus: null
    };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      id: null,
      email: null,
      role: "guest",
      plan: "free",
      subscriptionStatus: null
    };
  }

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("plan,status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  return {
    id: user.id,
    email: user.email ?? null,
    role: profile?.role === "admin" ? "admin" : "user",
    plan: (subscription?.plan as PlanKey | null) ?? "free",
    subscriptionStatus: subscription?.status ?? null
  };
}

export async function requireAdmin() {
  const viewer = await getViewer();

  if (viewer.role !== "admin") {
    return null;
  }

  return viewer;
}
