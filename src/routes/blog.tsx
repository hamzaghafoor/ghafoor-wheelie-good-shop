import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listArticlesPublic } from "@/lib/cms.functions";

const opts = queryOptions({ queryKey: ["articles-public"], queryFn: () => listArticlesPublic() });

export const Route = createFileRoute("/blog")({
  loader: ({ context }) => { context.queryClient.ensureQueryData(opts); },
  head: () => ({ meta: [
    { title: "Guides & Articles — Ghafoor Motors Tyres & Lubricants" },
    { name: "description", content: "Practical tyre and lubricant guides for Pakistan roads from Ghafoor Motors, Karachi." },
    { property: "og:title", content: "Guides & Articles — Ghafoor Motors" },
    { property: "og:description", content: "Practical tyre and lubricant guides for Pakistan roads." },
  ]}),
  component: BlogIndex,
});

function BlogIndex() {
  const { data: items } = useSuspenseQuery(opts);
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl md:text-4xl">Guides &amp; Articles</h1>
      <p className="mt-2 text-muted-foreground">Practical guidance from our team at Ghafoor Motors, Karachi.</p>
      {items.length === 0 ? (
        <div className="mt-8 rounded-lg border border-border bg-white p-10 text-center">
          <p className="text-muted-foreground">Articles are on the way. Check back soon or message us on WhatsApp for advice tailored to your vehicle.</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {items.map((a: any) => (
            <li key={a.id} className="rounded-lg border border-border bg-white p-5 hover:border-primary">
              <Link to="/blog/$slug" params={{ slug: a.slug }} className="block">
                <h2 className="font-display text-lg">{a.title}</h2>
                {a.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{a.excerpt}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
