import heroTyre from "@/assets/hero-tyre.png";

export type HeroTyreConfig = {
  className?: string;
};

/**
 * Clean, premium hero visual: a single photorealistic tyre + alloy wheel
 * on a subtle dark radial background with a restrained orange glow and
 * a soft grounded shadow. No 3D, no card border. Very slow float only.
 */
export function HeroTyreViewer(_config: HeroTyreConfig = {}) {
  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[520px]"
      role="img"
      aria-label="Automotive tyre and alloy wheel available at Ghafoor Motors"
    >
      {/* Dark radial backdrop */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,255,255,0.04), rgba(0,0,0,0) 70%)",
        }}
      />
      {/* Warm orange glow */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-60"
        style={{ background: "radial-gradient(closest-side, rgba(244,122,32,0.35), rgba(244,122,32,0) 70%)" }}
      />
      {/* Faint technical ring */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[86%] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
      />

      {/* Tyre — sized to ~78% of column, floats gently */}
      <img
        src={heroTyre}
        alt="Automotive tyre and alloy wheel available at Ghafoor Motors"
        width={1024}
        height={1024}
        fetchPriority="high"
        decoding="async"
        className="hero-tyre-float relative z-10 mx-auto block h-auto w-[78%] object-contain"
        style={{ filter: "drop-shadow(0 24px 24px rgba(0,0,0,0.55))" }}
      />

      {/* Grounded shadow beneath */}
      <div
        aria-hidden
        className="hero-tyre-shadow absolute left-1/2 bottom-[6%] h-4 w-[55%] -translate-x-1/2 rounded-[50%] blur-md"
        style={{ background: "radial-gradient(closest-side, rgba(0,0,0,0.55), rgba(0,0,0,0) 70%)" }}
      />

      <style>{`
        @keyframes heroTyreFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes heroTyreShadow {
          0%, 100% { opacity: 0.9; transform: translate(-50%, 0) scaleX(1); }
          50% { opacity: 0.7; transform: translate(-50%, 0) scaleX(0.92); }
        }
        .hero-tyre-float { animation: heroTyreFloat 6s ease-in-out infinite; }
        .hero-tyre-shadow { animation: heroTyreShadow 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .hero-tyre-float, .hero-tyre-shadow { animation: none; }
        }
      `}</style>
    </div>
  );
}
