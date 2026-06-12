import { OrbMark } from "@/components/brand/orb";

/** Home shell while auth, roster and projects resolve. */
export default function HomeLoading() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4">
        <OrbMark size={40} />
        <span className="typing-dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  );
}
