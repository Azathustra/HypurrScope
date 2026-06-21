import { notFound } from "next/navigation";
import { CheckCircle2, PlayCircle } from "lucide-react";
import { SectionHeading } from "@/components/saas/section-heading";
import { formationPrograms } from "@/lib/community-data";

export default async function FormationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = formationPrograms.find((item) => item.slug === slug);

  if (!program) {
    notFound();
  }

  return (
    <div className="space-y-7">
      <SectionHeading eyebrow={program.level} title={program.title} description="Parcours de formation prepare pour videos, progression et ressources membres." />
      <div className="premium-card rounded-[22px] p-5">
        <div className="grid gap-3">
          {program.lessons.map((lesson, index) => (
            <div key={lesson} className="flex items-center justify-between rounded-2xl border border-line bg-white/[0.025] p-4">
              <div className="flex items-center gap-3">
                <PlayCircle className="text-accent" size={20} />
                <div>
                  <p className="font-semibold text-white">{lesson}</p>
                  <p className="mt-1 text-sm text-muted">Module {index + 1}</p>
                </div>
              </div>
              <CheckCircle2 className="text-muted" size={18} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
