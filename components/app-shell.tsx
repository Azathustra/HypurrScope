"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { MobileNav } from "@/components/mobile-nav";
import { AuthProvider } from "@/components/auth-provider";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

const publicExactRoutes = ["/", "/pricing", "/community", "/methodologie", "/about", "/faq", "/login", "/signup", "/forgot-password"];
const publicPrefixes = ["/legal", "/research/"];
const privateOverrides = ["/research/premium"];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ShellContent>{children}</ShellContent>
    </AuthProvider>
  );
}

function ShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPrivateOverride = privateOverrides.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isPublicRoute =
    !isPrivateOverride &&
    (publicExactRoutes.includes(pathname) || publicPrefixes.some((prefix) => pathname.startsWith(prefix)));

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
          <div className="mt-8">
            <DisclaimerBanner compact />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
