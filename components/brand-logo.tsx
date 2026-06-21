import Link from "next/link";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <img
        src="/brand/insider-crypto-logo.png"
        alt="Insider Crypto"
        className={compact ? "h-10 w-10 rounded-full object-cover" : "h-12 w-12 rounded-full object-cover"}
      />
      {!compact ? (
        <span>
          <span className="block text-sm font-black uppercase tracking-[0.12em] text-white">Insider Crypto</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Research terminal</span>
        </span>
      ) : null}
    </Link>
  );
}
