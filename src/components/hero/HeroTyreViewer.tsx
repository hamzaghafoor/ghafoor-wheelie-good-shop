import { lazy, Suspense, useEffect, useRef, useState } from "react";
import fallbackImg from "@/assets/hero-tyre-3d.jpg";

const HeroTyre3D = lazy(() => import("./HeroTyre3D"));

function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type HeroTyreConfig = {
  modelUrl?: string;
  posterImageUrl?: string;
  environmentMap?: string;
  rotationSpeed?: number;
  enableInteraction?: boolean;
  mobileFallback?: boolean;
  attribution?: string;
};

export function HeroTyreViewer(config: HeroTyreConfig = {}) {
  const {
    posterImageUrl = fallbackImg,
    rotationSpeed = 0.15,
    enableInteraction = true,
    mobileFallback = true,
  } = config;

  const wrapRef = useRef<HTMLDivElement>(null);
  const [enable3D, setEnable3D] = useState(false);
  const [inView, setInView] = useState(true);
  const [interacted, setInteracted] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  // Decide whether to load 3D
  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (!hasWebGL()) return;

    const touch = window.matchMedia("(hover: none)").matches;
    setIsTouch(touch);
    const isSmall = window.innerWidth < 640;
    if (mobileFallback && isSmall && touch) return; // keep static on phones

    // Delay to avoid competing with LCP paint
    const t = window.setTimeout(() => setEnable3D(true), 250);
    return () => window.clearTimeout(t);
  }, [mobileFallback]);

  // Pause rendering when off-screen
  useEffect(() => {
    if (!wrapRef.current || !enable3D) return;
    const el = wrapRef.current;
    const obs = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [enable3D]);

  return (
    <div
      ref={wrapRef}
      className="relative aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b] shadow-2xl"
      role="img"
      aria-label="Interactive 3D preview of a premium tyre mounted on an alloy wheel"
    >
      {/* Static fallback / poster — always rendered so SSR + no-JS + no-WebGL all work */}
      <img
        src={posterImageUrl}
        alt="Premium tyre mounted on an alloy wheel, studio lit with a warm rim highlight"
        width={1024}
        height={1024}
        className="absolute inset-0 h-full w-full object-cover"
        fetchPriority="high"
      />

      {enable3D && inView && (
        <Suspense fallback={null}>
          <div className="absolute inset-0 animate-[fadein_.6s_ease-out_forwards] opacity-0">
            <HeroTyre3D
              rotationSpeed={rotationSpeed}
              enableInteraction={enableInteraction && !isTouch}
              onFirstInteraction={() => setInteracted(true)}
            />
          </div>
        </Suspense>
      )}

      {/* Interaction hint */}
      {enable3D && !interacted && !isTouch && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-medium tracking-wide text-white/85 backdrop-blur">
          Drag to explore
        </div>
      )}

      <style>{`@keyframes fadein { to { opacity: 1 } }`}</style>
    </div>
  );
}
