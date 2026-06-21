"use client";

import { Languages, Moon, Sun } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { useThemeMode } from "@/components/theme-provider";

export function SiteControls() {
  const { locale, toggleLocale } = useI18n();
  const { theme, toggleTheme } = useThemeMode();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleLocale}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:border-white/25"
        title="Changer de langue"
      >
        <Languages size={15} />
        {locale.toUpperCase()}
      </button>
      <button
        onClick={toggleTheme}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white transition hover:border-white/25"
        title={theme === "dark" ? "Mode jour" : "Mode nuit"}
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  );
}
