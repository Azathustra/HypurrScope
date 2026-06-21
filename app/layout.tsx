import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { I18nProvider } from "@/components/i18n-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: "Plateforme crypto premium pour research, communaute, portefeuilles, formations et signaux."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <I18nProvider>
            <AppShell>{children}</AppShell>
          </I18nProvider>
        </ThemeProvider>
        <Toaster theme="dark" richColors position="top-right" />
      </body>
    </html>
  );
}
