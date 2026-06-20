import Link from "next/link";
import { SectionHeading } from "@/components/saas/section-heading";
import { PlanBadge } from "@/components/saas/badges";
import { projects } from "@/lib/mock-saas-data";

export default function ProjectsPage() {
  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Projects" title="Fiches projets crypto" description="Scores, thèses, risques et catégories des actifs suivis." />
      <div className="grid gap-4 xl:grid-cols-2">
        {projects.map((project) => (
          <Link key={project.slug} href={`/projects/${project.slug}`} className="premium-card rounded-[20px] p-5">
            <PlanBadge plan={project.requiredPlan} />
            <h2 className="mt-4 text-xl font-semibold text-white">{project.name} ({project.ticker})</h2>
            <p className="mt-2 text-sm text-muted">{project.category} · Score {project.score}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
