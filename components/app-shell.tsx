"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { MobileNav } from "@/components/mobile-nav";
import { AuthProvider } from "@/components/auth-provider";

const publicPrefixes = ["/pricing", "/methodologie", "/research", "/about", "/faq", "/legal", "/login", "/signup"];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ShellContent>{children}</ShellContent>
    </AuthProvider>
  );
}

function ShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = publicPrefixes.some((prefix) => pathname === prefix || (prefix !== "/" && pathname.startsWith(prefix)));

  if (isPublicRoute) {
    return <div className="min-h-screen bg-ink">{children}</div>;
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[280px]">
        <Topbar />
        <main className="mx-auto max-w-[1680px] px-4 pb-28 pt-6 lg:px-8 lg:pb-8">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
