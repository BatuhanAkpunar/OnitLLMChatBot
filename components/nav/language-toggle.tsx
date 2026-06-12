"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Translate } from "@phosphor-icons/react";
import { setAppLanguage } from "@/app/(app)/actions";
import { useI18n } from "@/components/i18n-provider";

/**
 * Anonymous-friendly app-language switch: flips TR/EN via the onit_lang
 * cookie and re-renders the tree server-side. Signed-in users get the same
 * control inside the profile panel; this one lives in the public header.
 */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = lang === "tr" ? "en" : "tr";

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      await setAppLanguage(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("switchLanguage")}
      title={t("switchLanguage")}
      className={`inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${className}`}
    >
      <Translate size={16} weight="bold" />
      <span className="font-mono text-[11px] font-bold uppercase tracking-wide">
        {lang === "tr" ? "TR" : "EN"}
      </span>
    </button>
  );
}
