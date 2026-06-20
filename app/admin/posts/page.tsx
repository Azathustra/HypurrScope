import Link from "next/link";
import { AdminTable } from "@/components/saas/admin-table";
import { SectionHeading } from "@/components/saas/section-heading";
import { researchPosts } from "@/lib/mock-saas-data";

export default function AdminPostsPage() {
  return (
    <div className="space-y-7">
      <div className="flex items-end justify-between">
        <SectionHeading eyebrow="Admin" title="Posts research" />
        <Link href="/admin/posts/new" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink">Créer</Link>
      </div>
      <AdminTable title="Posts" rows={researchPosts.slice(0, 8).map((post) => ({ title: post.title, plan: post.requiredPlan, status: "published" }))} />
    </div>
  );
}
