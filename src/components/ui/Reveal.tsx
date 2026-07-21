import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  as?: "div" | "section" | "ul" | "li" | "article" | "header";
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
  amount?: number;
};

const ease = [0.22, 1, 0.36, 1] as const;

export function Reveal({ children, as = "div", delay = 0, y = 18, className, once = true, amount = 0.2 }: Props) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] as any;
  if (reduce) return <MotionTag className={className}>{children}</MotionTag>;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: 0.55, delay, ease }}
    >
      {children}
    </MotionTag>
  );
}

type StaggerProps = {
  children: ReactNode;
  className?: string;
  gap?: number;
  as?: "div" | "ul" | "section";
  once?: boolean;
};

export function Stagger({ children, className, gap = 0.08, as = "div", once = true }: StaggerProps) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] as any;
  const variants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : gap, delayChildren: 0.05 } },
  };
  return (
    <MotionTag className={className} variants={variants} initial="hidden" whileInView="show" viewport={{ once, amount: 0.15 }}>
      {children}
    </MotionTag>
  );
}

export function StaggerItem({ children, className, y = 16 }: { children: ReactNode; className?: string; y?: number }) {
  const reduce = useReducedMotion();
  const variants: Variants = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : { hidden: { opacity: 0, y }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } };
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}
