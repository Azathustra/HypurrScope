import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/saas/section-heading";
import { projects } from "@/lib/mock-saas-data";

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);

  if (!project) notFound();

  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Fiche projet" title={`${project.name} (${project.ticker})`} description={project.thesis} />
      <section className="premium-card rounded-[20px] p-5">
        <h2 className="text-xl font-semibold text-white">Risques</h2>
        <ul className="mt-4 space-y-2 text-sm text-muted">
          {project.risks.map((risk) => <li key={risk}>· {risk}</li>)}
        </ul>
      </section>
    </div>
  );
}
