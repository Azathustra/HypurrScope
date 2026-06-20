import { notFound } from "next/navigation";
import { PublicNavbar } from "@/components/saas/public-navbar";
import { PaywallCard } from "@/components/saas/paywall-card";
import { PlanBadge, RiskBadge, ConvictionBadge } from "@/components/saas/badges";
import { researchPosts } from "@/lib/mock-saas-data";
import { canAccess } from "@/lib/plans";
import { getViewer } from "@/lib/auth";

export default async function ResearchDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = researchPosts.find((item) => item.slug === slug);

  if (!post) {
    notFound();
  }

  const viewer = await getViewer();
  const allowed = canAccess(post.requiredPlan, viewer.plan);
  const preview = post.content.split("\n").slice(0, 6).join("\n");

  return (
    <>
      <PublicNavbar />
      <main className="mx-auto max-w-4xl space-y-7 px-4 py-10 lg:px-8">
        <div>
          <div className="flex flex-wrap gap-2">
            <PlanBadge plan={post.requiredPlan} />
            <RiskBadge risk={post.riskLevel} />
            <ConvictionBadge conviction={post.conviction} />
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white">{post.title}</h1>
          <p className="mt-4 text-lg leading-8 text-muted">{post.excerpt}</p>
        </div>
        <article className="premium-card whitespace-pre-line rounded-[20px] p-6 text-sm leading-7 text-white">
          {allowed ? post.content : preview}
        </article>
        {!allowed ? <PaywallCard requiredPlan={post.requiredPlan} /> : null}
      </main>
    </>
  );
}
