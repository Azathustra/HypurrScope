import { SectionHeading } from "@/components/saas/section-heading";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Admin" title={`Éditer le post ${id}`} />
      <div className="premium-card rounded-[20px] p-5 text-muted">Formulaire d'édition prêt pour Supabase.</div>
    </div>
  );
}
