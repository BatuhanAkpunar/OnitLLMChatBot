"use client";

import { UsersThree, RocketLaunch, Brain, type Icon } from "@phosphor-icons/react";
import { useI18n } from "@/components/i18n-provider";
import type { I18nKey } from "@/lib/i18n";

/**
 * The product promise in three beats, rocket.new style: few words, an icon
 * with a gentle motion, no walls of text. Sits right under the composer so
 * a first-time visitor learns what Onit is before meeting the team.
 */
const PILLARS: {
  icon: Icon;
  tint: string;
  title: I18nKey;
  body: I18nKey;
}[] = [
  { icon: UsersThree, tint: "#a78bfa", title: "pillar1Title", body: "pillar1Body" },
  { icon: RocketLaunch, tint: "#38bdf8", title: "pillar2Title", body: "pillar2Body" },
  { icon: Brain, tint: "#34d399", title: "pillar3Title", body: "pillar3Body" },
];

export function Vision() {
  const { t } = useI18n();
  return (
    <section className="mt-16">
      <div className="grid gap-3.5 sm:grid-cols-3">
        {PILLARS.map(({ icon: IconCmp, tint, title, body }, i) => (
          <div
            key={title}
            className="pixel-panel-soft group p-5 transition-transform duration-150 hover:-translate-y-1 hover:translate-x-0"
          >
            <span
              className="onit-pillar-icon mb-3.5 grid h-11 w-11 place-items-center rounded-xl border-[1.5px]"
              style={
                {
                  "--pillar-delay": `${i * 0.6}s`,
                  backgroundColor: `color-mix(in srgb, ${tint} 14%, transparent)`,
                  borderColor: `color-mix(in srgb, ${tint} 45%, transparent)`,
                  color: tint,
                } as React.CSSProperties
              }
            >
              <IconCmp size={22} weight="duotone" />
            </span>
            <h3 className="font-pixel text-[15px] tracking-tight">{t(title)}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/65">
              {t(body)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
