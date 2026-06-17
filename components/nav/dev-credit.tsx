"use client";

import { useEffect, useRef, useState } from "react";
import {
  GithubLogo,
  LinkedinLogo,
  MediumLogo,
  ArrowUpRight,
} from "@phosphor-icons/react";
import { useI18n } from "@/components/i18n-provider";

const LINKS = [
  {
    label: "GitHub",
    href: "https://github.com/BatuhanAkpunar",
    icon: GithubLogo,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/batuhanakpunar",
    icon: LinkedinLogo,
  },
  {
    label: "Medium",
    href: "https://batuhanakpunar.medium.com",
    icon: MediumLogo,
  },
];

/**
 * "Built by" credit in the public header: a small pixel portrait that opens
 * a shadcn-style popover with the developer's profile links.
 */
export function DevCredit() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t("devAria")}
        title={t("devAria")}
        className={`inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card pl-1.5 pr-2.5 transition-colors hover:bg-accent ${
          open ? "bg-accent" : ""
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/developer-batuhan.png"
          alt=""
          width={24}
          height={24}
          className="h-6 w-6 select-none rounded-[5px] object-cover"
          draggable={false}
        />
        <span className="hidden text-[12px] font-medium text-muted-foreground sm:inline">
          {t("devChip")}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl">
          <div className="flex items-center gap-3 border-b border-border p-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/developer-batuhan.png"
              alt="Batuhan Akpunar"
              width={52}
              height={52}
              className="h-13 w-13 shrink-0 select-none rounded-lg object-cover"
              style={{ width: 52, height: 52 }}
              draggable={false}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Batuhan Akpunar</p>
              <p className="text-xs text-muted-foreground">{t("devRole")}</p>
            </div>
          </div>
          <div className="p-1.5">
            {LINKS.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
              >
                <Icon size={16} weight="fill" className="text-muted-foreground" />
                <span className="flex-1">{label}</span>
                <ArrowUpRight
                  size={13}
                  className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                />
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
