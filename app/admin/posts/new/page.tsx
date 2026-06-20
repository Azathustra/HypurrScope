import { SectionHeading } from "@/components/saas/section-heading";

export default function NewPostPage() {
  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Admin" title="Créer un post" description="Formulaire prêt pour /api/admin/posts avec validation Zod." />
      <form className="premium-card grid gap-3 rounded-[20px] p-5">
        <input name="title" className="rounded-xl border border-line bg-black/20 px-4 py-3 text-white" placeholder="Titre" />
        <textarea name="content" className="min-h-48 rounded-xl border border-line bg-black/20 px-4 py-3 text-white" placeholder="Markdown" />
        <select name="required_plan" className="rounded-xl border border-line bg-black/20 px-4 py-3 text-white">
          <option>free</option>
          <option>member</option>
          <option>pro</option>
          <option>desk</option>
        </select>
        <button className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink">Publier</button>
      </form>
    </div>
  );
}
