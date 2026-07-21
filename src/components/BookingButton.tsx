import { Calendar } from "lucide-react";
import { openBookingPopup, resolveCalendlyUrl, useBookingSettings, type CalendlyContext } from "@/lib/booking";

type Props = {
  serviceKey?: string | null;
  context?: CalendlyContext;
  className?: string;
  label?: string;
  variant?: "primary" | "outline" | "light";
  size?: "sm" | "md";
};

export function BookingButton({
  serviceKey,
  context,
  className,
  label = "Book Appointment",
  variant = "outline",
  size = "md",
}: Props) {
  const settings = useBookingSettings();
  if (settings.isLoading) return null;
  const url = resolveCalendlyUrl(settings, serviceKey);
  if (!url) return null;

  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:opacity-60";
  const sizes = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm";
  const variants: Record<string, string> = {
    primary: "bg-primary text-white hover:bg-primary/90",
    outline: "border border-border bg-white text-ink hover:border-primary hover:text-primary",
    light: "border border-white/25 bg-white/10 text-white hover:bg-white/20",
  };

  return (
    <button
      type="button"
      onClick={() => openBookingPopup(url, { medium: "web", ...(context ?? {}) })}
      className={`${base} ${sizes} ${variants[variant]} ${className ?? ""}`}
      aria-label={label}
    >
      <Calendar className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} /> {label}
    </button>
  );
}
