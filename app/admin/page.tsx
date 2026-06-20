import Link from "next/link";
import { SectionHeading } from "@/components/saas/section-heading";
import { AdminTable } from "@/components/saas/admin-table";
import { requireAdmin } from "@/lib/auth";

const adminLinks = [
  ["/admin/posts", "Posts"],
  ["/admin/portfolios", "Portefeuilles"],
  ["/admin/signals", "Signaux"],
  ["/admin/users", "Utilisateurs"],
  ["/admin/subscriptions", "Abonnements"]
];

export default async function AdminPage() {
  const admin = await requireAdmin();

  if (!admin && process.env.NEXT_PUBLIC_DEMO_ADMIN !== "true") {
    return <AdminDenied />;
  }

  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Admin" title="Back-office Insider Crypto" description="Gestion éditoriale, abonnements et utilisateurs." />
      <div className="grid gap-4 md:grid-cols-3">
        {adminLinks.map(([href, label]) => (
          <Link key={href} href={href} className="premium-card rounded-[20px] p-5 text-lg font-semibold text-white">{label}</Link>
        ))}
      </div>
      <AdminTable title="Activité récente" rows={[{ type: "post", status: "draft", date: "2026-06-20" }, { type: "signal", status: "published", date: "2026-06-19" }]} />
    </div>
  );
}

function AdminDenied() {
  return (
    <div className="premium-card rounded-[20px] p-6">
      <h1 className="text-2xl font-semibold text-white">Accès admin refusé</h1>
      <p className="mt-2 text-muted">L'admin est contrôlé par profiles.role = 'admin'.</p>
    </div>
  );
}
