"use client";

import { motion, type Transition } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * MagicUI BorderBeam (adapted): a light beam that travels around an element's
 * border. Parent must be `relative` and `overflow-hidden`. We use it on the
 * composer when focused / while the team works.
 */
interface BorderBeamProps {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
  reverse?: boolean;
}

export function BorderBeam({
  size = 60,
  duration = 6,
  delay = 0,
  colorFrom = "var(--agent-product-manager)",
  colorTo = "var(--agent-analyst)",
  className,
  reverse = false,
}: BorderBeamProps) {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
      <motion.div
        className={cn(
          "absolute aspect-square bg-gradient-to-l from-[var(--from)] via-[var(--to)] to-transparent",
          className,
        )}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            "--from": colorFrom,
            "--to": colorTo,
          } as React.CSSProperties
        }
        initial={{ offsetDistance: reverse ? "100%" : "0%" }}
        animate={{ offsetDistance: reverse ? ["100%", "0%"] : ["0%", "100%"] }}
        transition={
          {
            repeat: Infinity,
            ease: "linear",
            duration,
            delay: -delay,
          } as Transition
        }
      />
    </div>
  );
}
