import { useReducedMotion } from "framer-motion";

type Brand = { id: string; name: string; logo_url?: string | null };

export function BrandMarquee({ brands, speed = 40 }: { brands: Brand[]; speed?: number }) {
  const reduce = useReducedMotion();
  if (!brands.length) return null;
  // Duplicate for seamless loop.
  const items = [...brands, ...brands];
  const duration = Math.max(20, brands.length * speed / 4);

  if (reduce) {
    return (
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {brands.map((b) => (
          <BrandTile key={b.id} brand={b} />
        ))}
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div
        className="flex w-max gap-4 animate-brand-marquee group-hover:[animation-play-state:paused]"
        style={{ animationDuration: `${duration}s` }}
      >
        {items.map((b, i) => (
          <div key={`${b.id}-${i}`} className="w-32 shrink-0 sm:w-36">
            <BrandTile brand={b} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BrandTile({ brand }: { brand: Brand }) {
  return (
    <div className="card-surface flex aspect-square items-center justify-center p-3 transition duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
      {brand.logo_url ? (
        <img
          src={brand.logo_url}
          alt={brand.name}
          loading="lazy"
          className="max-h-full max-w-full object-contain opacity-80 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0"
        />
      ) : (
        <span className="text-center text-xs font-semibold text-ink">{brand.name}</span>
      )}
    </div>
  );
}
