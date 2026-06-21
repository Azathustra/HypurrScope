import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/saas/section-heading";
import { formationPrograms } from "@/lib/community-data";

export default function FormationsPage() {
  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Formation" title="Parcours premium" description="Modules pedagogiques pour comprendre le marche, construire une methode et suivre les portefeuilles." />
      <div className="grid gap-4 xl:grid-cols-3">
        {formationPrograms.map((program) => (
          <Link key={program.slug} href={`/formations/${program.slug}`} className="premium-card rounded-[20px] p-5 transition hover:border-white/16">
            <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-semibold text-white">{program.level}</span>
            <h2 className="mt-5 text-xl font-semibold text-white">{program.title}</h2>
            <div className="mt-4 space-y-2">
              {program.lessons.map((lesson) => (
                <p key={lesson} className="text-sm text-muted">{lesson}</p>
              ))}
            </div>
            <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">
              Ouvrir <ArrowRight size={15} />
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
