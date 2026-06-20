import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-black/92 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black text-ink">IC</span>
          <span>
            <span className="block text-sm font-black uppercase tracking-[0.12em] text-white">Insider Crypto</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Research terminal</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-xs font-bold uppercase tracking-[0.18em] text-muted md:flex">
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link href="/research" className="hover:text-white">Research</Link>
          <Link href="/methodologie" className="hover:text-white">Méthodologie</Link>
          <Link href="/faq" className="hover:text-white">FAQ</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white">Login</Link>
          <Link href="/pricing" className="hidden rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink sm:inline-flex">
            <LockKeyhole size={15} className="mr-2" /> Devenir membre
          </Link>
        </div>
      </div>
    </header>
  );
}
