import { Check } from "lucide-react";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

export function WhyChecklist({ items }: { items: string[] }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  return (
    <ul className="grid gap-2">
      {items.map((s, i) => (
        <motion.li
          key={s}
          initial={reduce ? false : { opacity: 0, x: -12 }}
          whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          onHoverStart={() => setActive(i)}
          onHoverEnd={() => setActive(null)}
          className="flex items-start gap-3 rounded-lg border border-transparent px-3 py-2 transition hover:border-border hover:bg-surface"
        >
          <span
            className={`mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full transition-all duration-300 ${
              active === i ? "scale-110 bg-primary text-white" : "bg-primary/10 text-primary"
            }`}
          >
            <Check className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm text-foreground/85 md:text-base">{s}</span>
        </motion.li>
      ))}
    </ul>
  );
}
