import { AdminTable } from "@/components/saas/admin-table";
import { SectionHeading } from "@/components/saas/section-heading";

export default function AdminUsersPage() {
  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Admin" title="Utilisateurs" />
      <AdminTable title="Utilisateurs mockés" rows={[{ email: "member@cryptoholdup.io", role: "user", plan: "member" }, { email: "admin@cryptoholdup.io", role: "admin", plan: "desk" }]} />
    </div>
  );
}
