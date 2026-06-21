import { BookOpenCheck, Clock3, GraduationCap, LockKeyhole, SignalHigh } from "lucide-react";
import { formationTracks } from "@/lib/mock-data";

export default function FormationPage() {
  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Formation</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-5xl">
          Se former avec Crypto Hold-Up
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
          Parcours premium pour apprendre à lire le marché, construire un portefeuille et transformer les données crypto en décisions.
        </p>
      </div>

      <section className="premium-card rounded-[22px] p-5 lg:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Parcours", "3", GraduationCap],
            ["Modules", "15", BookOpenCheck],
            ["Signaux pratiques", "28", SignalHigh]
          ].map(([label, value, Icon]) => (
            <div key={label as string} className="rounded-2xl border border-line bg-white/[0.025] p-5">
              <Icon className="text-accent" size={20} />
              <p className="mt-4 text-2xl font-semibold text-white">{value as string}</p>
              <p className="mt-1 text-sm text-muted">{label as string}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {formationTracks.map((track) => (
          <article key={track.title} className="premium-card rounded-[20px] p-5 transition hover:border-white/16 hover:bg-panelSoft">
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-semibold text-white">
                {track.level}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs text-muted">
                <Clock3 size={13} />
                {track.duration}
              </span>
            </div>
            <h2 className="mt-5 text-xl font-semibold text-white">{track.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{track.description}</p>
            <div className="mt-5 space-y-2">
              {track.lessons.map((lesson) => (
                <div key={lesson} className="flex items-center gap-2 text-sm text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {lesson}
                </div>
              ))}
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-positive">
              <LockKeyhole size={15} />
              Inclus avec l'accès membre
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
