export function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-5xl">{title}</h1>
      {description ? <p className="mt-3 max-w-3xl text-base leading-7 text-muted">{description}</p> : null}
    </div>
  );
}
