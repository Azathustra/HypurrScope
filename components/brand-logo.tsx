import Link from "next/link";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <img
        src="/brand/crypto-hold-up-logo.png"
        alt={BRAND_NAME}
        className={compact ? "h-10 w-10 rounded-full object-cover" : "h-12 w-12 rounded-full object-cover"}
      />
      {!compact ? (
        <span>
          <span className="block text-sm font-black uppercase tracking-[0.12em] text-white">{BRAND_NAME}</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{BRAND_TAGLINE}</span>
        </span>
      ) : null}
    </Link>
  );
}
