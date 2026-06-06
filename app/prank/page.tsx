export default function PrankPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#031815] text-white">
      <div className="absolute inset-0 opacity-60">
        <div className="absolute left-[-10rem] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute right-[-8rem] bottom-[-8rem] h-[32rem] w-[32rem] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.32em] text-emerald-100/80">
            Scientific Hypurr Report
          </div>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            Fox vs Aza
          </h1>
          <p className="mt-3 text-sm text-white/55">
            Étude totalement sérieuse, validée par absolument personne.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <article className="rounded-[2rem] border border-red-200/25 bg-red-950/25 p-6 shadow-2xl shadow-black/30">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-red-100/50">
                  Fox department
                </p>
                <h2 className="mt-2 text-3xl font-black md:text-5xl">
                  Fox a un petit zizi
                </h2>
              </div>
              <div className="rounded-2xl border border-red-200/20 bg-red-400/10 px-3 py-2 text-sm font-black text-red-100">
                mini mode
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
              <UglyFox />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <Stat label="Aura" value="2/100" />
              <Stat label="Style" value="404" />
              <Stat label="Rizz" value="-12%" />
            </div>
          </article>

          <article className="rounded-[2rem] border border-emerald-200/40 bg-emerald-400/10 p-6 shadow-2xl shadow-emerald-950/30">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-100/60">
                  Aza department
                </p>
                <h2 className="mt-2 text-3xl font-black md:text-5xl">
                  Aza a un énoooooorme charisme
                </h2>
              </div>
              <div className="rounded-2xl border border-emerald-200/30 bg-emerald-300/15 px-3 py-2 text-sm font-black text-emerald-100">
                giga mode
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
              <HeroAza />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <Stat label="Aura" value="999+" />
              <Stat label="Muscles" value="MAX" />
              <Stat label="Rizz" value="∞" />
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/35">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
}

function UglyFox() {
  return (
    <svg viewBox="0 0 720 520" className="h-[22rem] w-full" role="img" aria-label="Ugly cartoon fox">
      <rect width="720" height="520" rx="36" fill="#120b0b" />
      <circle cx="120" cy="92" r="70" fill="#401010" opacity="0.55" />
      <circle cx="608" cy="426" r="94" fill="#401010" opacity="0.45" />

      <path d="M222 142 L272 42 L318 160 Z" fill="#c95c1e" stroke="#2b1007" strokeWidth="10" />
      <path d="M498 142 L448 42 L402 160 Z" fill="#c95c1e" stroke="#2b1007" strokeWidth="10" />
      <path d="M246 118 L274 72 L296 138 Z" fill="#f2d1a7" opacity="0.8" />
      <path d="M474 118 L446 72 L424 138 Z" fill="#f2d1a7" opacity="0.8" />

      <ellipse cx="360" cy="248" rx="180" ry="142" fill="#e06b22" stroke="#2b1007" strokeWidth="12" />
      <path d="M230 290 C260 410 458 410 490 290 C460 342 264 342 230 290 Z" fill="#f3ddc4" />
      <ellipse cx="302" cy="230" rx="30" ry="38" fill="#141414" />
      <ellipse cx="422" cy="230" rx="30" ry="38" fill="#141414" />
      <circle cx="292" cy="216" r="8" fill="white" />
      <circle cx="410" cy="216" r="8" fill="white" />
      <path d="M352 258 L372 258 L362 280 Z" fill="#171717" />
      <path d="M280 178 C310 158 335 172 342 188" fill="none" stroke="#1d100b" strokeWidth="10" strokeLinecap="round" />
      <path d="M384 188 C392 168 424 158 448 178" fill="none" stroke="#1d100b" strokeWidth="10" strokeLinecap="round" />
      <path d="M300 314 C334 296 390 298 426 318" fill="none" stroke="#1d100b" strokeWidth="10" strokeLinecap="round" />

      <path d="M166 335 C86 310 74 210 146 188 C118 262 174 280 222 284" fill="#e06b22" stroke="#2b1007" strokeWidth="10" />
      <path d="M132 196 C96 226 112 286 170 308" fill="none" stroke="#f3ddc4" strokeWidth="22" strokeLinecap="round" />

      <text x="360" y="465" textAnchor="middle" fontSize="30" fontWeight="900" fill="#ffd6d6">
        renard tout éclaté edition
      </text>
    </svg>
  );
}

function HeroAza() {
  return (
    <svg viewBox="0 0 720 520" className="h-[22rem] w-full" role="img" aria-label="Strong handsome cartoon man">
      <defs>
        <linearGradient id="heroGlow" x1="0" x2="1">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <rect width="720" height="520" rx="36" fill="#031815" />
      <circle cx="360" cy="260" r="210" fill="url(#heroGlow)" opacity="0.55" />

      <path d="M245 318 C180 284 154 226 172 188 C228 208 266 244 286 286" fill="#f0b58f" stroke="#35170c" strokeWidth="10" />
      <path d="M475 318 C540 284 566 226 548 188 C492 208 454 244 434 286" fill="#f0b58f" stroke="#35170c" strokeWidth="10" />
      <circle cx="360" cy="126" r="72" fill="#f0b58f" stroke="#35170c" strokeWidth="10" />
      <path d="M294 108 C318 32 408 36 434 104 C394 86 334 86 294 108 Z" fill="#151515" />
      <path d="M300 144 C322 164 342 154 354 144" fill="none" stroke="#35170c" strokeWidth="8" strokeLinecap="round" />
      <path d="M420 144 C398 164 378 154 366 144" fill="none" stroke="#35170c" strokeWidth="8" strokeLinecap="round" />
      <path d="M330 176 C350 194 376 194 396 176" fill="none" stroke="#35170c" strokeWidth="8" strokeLinecap="round" />

      <path d="M255 250 C292 214 428 214 465 250 L500 420 C442 450 278 450 220 420 Z" fill="#20c997" stroke="#052e27" strokeWidth="10" />
      <path d="M305 250 C332 326 388 326 415 250" fill="none" stroke="#eafff8" strokeWidth="10" strokeLinecap="round" opacity="0.9" />
      <path d="M300 320 C330 350 390 350 420 320" fill="none" stroke="#052e27" strokeWidth="10" strokeLinecap="round" />
      <path d="M230 424 H490" stroke="#eafff8" strokeWidth="14" strokeLinecap="round" opacity="0.55" />

      <path d="M116 128 L158 154 L200 128 L174 174 L202 220 L158 194 L114 220 L142 174 Z" fill="#fde68a" opacity="0.95" />
      <path d="M520 112 L558 136 L596 112 L572 154 L598 196 L558 172 L518 196 L544 154 Z" fill="#a7f3d0" opacity="0.9" />

      <text x="360" y="476" textAnchor="middle" fontSize="32" fontWeight="900" fill="#d1fae5">
        Aza ultra légendaire
      </text>
    </svg>
  );
}
