import { motion, useMotionValue, useSpring, useTransform, useReducedMotion, useScroll } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import heroTyre from "@/assets/hero-tyre.png";

/**
 * Cinematic layered hero composition — no WebGL, no 3D.
 * Depth is faked with stacked CSS layers, cursor parallax, scroll transforms,
 * and a one-shot light sweep. Fully respects reduced-motion and mobile.
 */
export function HeroTyreViewer() {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(false);
  const [sweep, setSweep] = useState(false);

  // Cursor position, normalized to -1..1
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 18, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 80, damping: 18, mass: 0.6 });

  // Parallax amounts (px)
  const t = (amount: number) => useTransform(sx, [-1, 1], [-amount, amount]);
  const tY = (amount: number) => useTransform(sy, [-1, 1], [-amount, amount]);
  const circlesX = t(4); const circlesY = tY(4);
  const glowX = t(7); const glowY = tY(7);
  const tyreX = t(10); const tyreY = tY(10);
  const tyreRot = useTransform(sx, [-1, 1], [-1.5, 1.5]);
  const labelsX = t(14); const labelsY = tY(14);
  const shadowX = useTransform(sx, [-1, 1], [4, -4]);

  // Scroll-linked motion on the section
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end start"],
  });
  const scrollTyreY = useTransform(scrollYProgress, [0, 1], [0, -25]);
  const scrollTyreScale = useTransform(scrollYProgress, [0, 1], [1, 1.04]);
  const scrollGlowOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.4]);
  const scrollLabelsOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  useEffect(() => {
    setIsTouch(window.matchMedia("(hover: none), (pointer: coarse)").matches);
    if (reduce) return;
    const id = window.setTimeout(() => setSweep(true), 1500);
    return () => window.clearTimeout(id);
  }, [reduce]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouch || reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    mx.set(nx); my.set(ny);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.div
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative mx-auto aspect-square w-full max-w-[520px]"
      style={{ perspective: 1200 }}
      role="img"
      aria-label="Automotive tyre and alloy wheel available at Ghafoor Motors"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      {/* Technical grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          maskImage: "radial-gradient(closest-side, black 40%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(closest-side, black 40%, transparent 75%)",
        }}
      />

      {/* Concentric circles + backdrop */}
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{ x: circlesX, y: circlesY }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.05), rgba(0,0,0,0) 70%)" }}
        />
        {[92, 78, 62].map((s) => (
          <div
            key={s}
            className="absolute left-1/2 top-1/2 rounded-full border border-white/10"
            style={{ width: `${s}%`, height: `${s}%`, transform: "translate(-50%, -50%)" }}
          />
        ))}
        <div
          className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 shadow-[0_0_18px_2px_rgba(255,255,255,0.35)]"
        />
      </motion.div>

      {/* Orange glow */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[75%] w-[75%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          x: glowX, y: glowY,
          opacity: scrollGlowOpacity,
          background: "radial-gradient(closest-side, rgba(244,122,32,0.45), rgba(244,122,32,0) 70%)",
        }}
      />

      {/* Grounded shadow */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 bottom-[6%] h-4 w-[55%] -translate-x-1/2 rounded-[50%] blur-md"
        style={{
          x: shadowX,
          background: "radial-gradient(closest-side, rgba(0,0,0,0.65), rgba(0,0,0,0) 70%)",
        }}
      />

      {/* Tyre + light sweep */}
      <motion.div
        className="relative z-10 mx-auto flex h-full w-[78%] items-center justify-center"
        style={{ x: tyreX, y: useTransform([tyreY, scrollTyreY] as any, ([a, b]: any) => a + b), rotate: tyreRot, scale: scrollTyreScale }}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative w-full overflow-hidden">
          <img
            src={heroTyre}
            alt="Automotive tyre and alloy wheel available at Ghafoor Motors"
            width={1024}
            height={1024}
            fetchPriority="high"
            decoding="async"
            className="relative block h-auto w-full object-contain"
            style={{ filter: "drop-shadow(0 30px 30px rgba(0,0,0,0.6))" }}
          />
          {sweep && !reduce && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{
                maskImage: "radial-gradient(circle at center, black 55%, transparent 62%)",
                WebkitMaskImage: "radial-gradient(circle at center, black 55%, transparent 62%)",
              }}
            >
              <div
                className="hero-sweep absolute -inset-y-4 -left-1/3 w-1/3"
                style={{
                  background:
                    "linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.18) 45%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.18) 55%, transparent 100%)",
                  filter: "blur(6px)",
                }}
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* Small orange reflection */}
      <div
        aria-hidden
        className="absolute bottom-[10%] left-1/2 h-1 w-[30%] -translate-x-1/2 rounded-full opacity-70 blur-md"
        style={{ background: "linear-gradient(90deg, transparent, rgba(244,122,32,0.6), transparent)" }}
      />

      {/* Floating spec labels */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden md:block"
        style={{ x: labelsX, y: labelsY, opacity: scrollLabelsOpacity }}
      >
        <SpecLabel text="Professional Fitting" className="left-[2%] top-[18%]" line="right" />
        <SpecLabel text="Wheel Care" className="right-[2%] bottom-[22%]" line="left" />
      </motion.div>

      <style>{`
        @keyframes heroSweep {
          0% { transform: translateX(0) rotate(6deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateX(520%) rotate(6deg); opacity: 0; }
        }
        .hero-sweep { animation: heroSweep 1.2s cubic-bezier(0.22,1,0.36,1) 1 forwards; }
        @media (prefers-reduced-motion: reduce) {
          .hero-sweep { animation: none; display: none; }
        }
      `}</style>
    </motion.div>
  );
}

function SpecLabel({ text, className, line }: { text: string; className: string; line: "left" | "right" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.9 }}
      className={`absolute flex items-center gap-2 ${className}`}
    >
      {line === "left" && <div className="h-px w-10 bg-gradient-to-l from-primary to-transparent" />}
      <div className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold tracking-wide text-white/90 backdrop-blur-md">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
        {text}
      </div>
      {line === "right" && <div className="h-px w-10 bg-gradient-to-r from-primary to-transparent" />}
    </motion.div>
  );
}
