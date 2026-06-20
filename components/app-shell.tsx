"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { MobileNav } from "@/components/mobile-nav";
import { AuthProvider } from "@/components/auth-provider";
import { AuthGate } from "@/components/auth-gate";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ShellContent>{children}</ShellContent>
    </AuthProvider>
  );
}

function ShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <div className="min-h-screen bg-ink">{children}</div>;
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[250px]">
        <Topbar />
        <main className="mx-auto max-w-7xl px-4 pb-28 pt-8 lg:px-8 lg:pb-8">
          <AuthGate>{children}</AuthGate>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
