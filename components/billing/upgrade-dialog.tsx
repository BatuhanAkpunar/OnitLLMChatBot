"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Lightning, Check, X } from "@phosphor-icons/react";
import { useI18n } from "@/components/i18n-provider";
import type { I18nKey } from "@/lib/i18n";
import { PRO_PRICE_USD, FREE_DAILY_MESSAGES } from "@/lib/billing";

const BENEFITS: I18nKey[] = ["proBenefit1", "proBenefit2", "proBenefit3"];

/**
 * Pro upgrade dialog. Shown when a free user hits the daily message cap
 * (reason="limit") or from the profile panel. Checkout is a placeholder until
 * Stripe is wired; the CTA shows a "coming soon" state instead of taking money.
 */
export function UpgradeDialog({
  open,
  onClose,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  reason?: "limit";
}) {
  const { t } = useI18n();
  const [soon, setSoon] = useState(false);

  useEffect(() => {
    if (!open) setSoon(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("upgradeTitle")}
    >
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("upgradeMaybe")}
          className="pressable absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X size={16} weight="bold" />
        </button>

        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
            <Lightning size={18} weight="fill" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">{t("upgradeTitle")}</h2>
            <div className="text-[13px] text-muted-foreground">
              {t("proPrice", { price: PRO_PRICE_USD })}
            </div>
          </div>
        </div>

        <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground">
          {reason === "limit"
            ? t("upgradeLimit", { n: FREE_DAILY_MESSAGES })
            : t("upgradeBlurb")}
        </p>

        <ul className="mt-4 space-y-2">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-2 text-[13.5px]">
              <Check size={15} weight="bold" className="shrink-0 text-emerald-500" />
              {t(b)}
            </li>
          ))}
        </ul>

        {soon ? (
          <p className="mt-5 rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-center text-[13px] text-muted-foreground">
            {t("upgradeSoon")}
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setSoon(true)}
            className="pressable mt-5 w-full rounded-xl border-[1.5px] border-foreground bg-primary py-2.5 text-[14px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t("upgradeCta")}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full py-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          {t("upgradeMaybe")}
        </button>
      </div>
    </div>,
    document.body,
  );
}
