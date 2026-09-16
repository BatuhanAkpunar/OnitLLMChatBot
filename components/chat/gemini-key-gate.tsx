"use client";

import { useState } from "react";
import { Key, ArrowSquareOut } from "@phosphor-icons/react";
import { saveGeminiKey } from "@/app/(app)/key-actions";
import { useI18n } from "@/components/i18n-provider";

/**
 * Bring-your-own-key onboarding. Shown in the chat until the user has stored a
 * Gemini API key. The key is saved server-side in an httpOnly cookie (see
 * key-actions.ts); this form never keeps it in React state after saving.
 */
export function GeminiKeyGate({ onSaved }: { onSaved: () => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function save() {
    const key = value.trim();
    if (!key || busy) return;
    setBusy(true);
    setError(false);
    const res = await saveGeminiKey(key);
    if (res.ok) {
      setValue("");
      onSaved();
    } else {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="pixel-panel bg-card p-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border-[1.5px] border-foreground/80 bg-primary text-primary-foreground">
            <Key size={18} weight="bold" />
          </span>
          <h2 className="font-pixel text-[16px] tracking-wide">
            {t("keyGateTitle")}
          </h2>
        </div>

        <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
          {t("keyGateBody")}
        </p>

        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="AIza..."
          className="mt-4 w-full rounded-lg border-2 border-foreground/70 bg-background px-3 py-2 font-mono text-[13px] outline-none transition-colors focus:border-foreground dark:border-border"
        />
        {error ? (
          <p className="mt-1.5 text-[12px] font-medium text-destructive">
            {t("keyInvalid")}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3">
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {t("keyGet")}
            <ArrowSquareOut size={13} weight="bold" />
          </a>
          <button
            type="button"
            onClick={save}
            disabled={busy || !value.trim()}
            className="pressable inline-flex h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-foreground bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {t("keySave")}
          </button>
        </div>

        <p className="mt-3 text-[11.5px] leading-snug text-muted-foreground/80">
          {t("keyPrivacy")}
        </p>
      </div>
    </div>
  );
}
