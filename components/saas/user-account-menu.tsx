import Link from "next/link";
import { UserRound } from "lucide-react";

export function UserAccountMenu() {
  return (
    <Link href="/account" className="flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm text-white">
      <UserRound size={16} />
      Compte
    </Link>
  );
}
