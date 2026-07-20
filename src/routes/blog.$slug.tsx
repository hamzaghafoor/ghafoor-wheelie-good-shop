import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getArticlePublic } from "@/lib/cms.functions";

const opts = (slug: string) => queryOptions({
  queryKey: ["article", slug],
  queryFn: async () => {
    const row = await getArticlePublic({ data: { slug } });
    if (!row) throw notFound();
    return row;
  },
});

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(opts(params.slug)),
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Article not found" }, { name: "robots", content: "noindex" }] };
    const a: any = loaderData;
    return { meta: [
      { title: a.seo_title || `${a.title} — Ghafoor Motors` },
      { name: "description", content: a.seo_description || a.excerpt || a.title },
      { property: "og:title", content: a.seo_title || a.title },
      { property: "og:description", content: a.seo_description || a.excerpt || "" },
      { property: "og:type", content: "article" },
    ]};
  },
  component: ArticlePage,
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="font-display text-2xl">Article not found</h1>
      <p className="mt-3 text-muted-foreground">This article may have been unpublished.</p>
      <Link to="/blog" className="mt-6 inline-block text-primary underline">Back to all articles</Link>
    </main>
  ),
  errorComponent: () => <main className="mx-auto max-w-3xl px-4 py-16 text-center"><p className="text-muted-foreground">Something went wrong loading this article.</p></main>,
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const { data: a } = useSuspenseQuery(opts(slug));
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/blog" className="text-sm text-muted-foreground hover:text-primary">← All articles</Link>
      <h1 className="mt-4 font-display text-3xl md:text-4xl">{a.title}</h1>
      {a.excerpt && <p className="mt-3 text-lg text-muted-foreground">{a.excerpt}</p>}
      <article className="prose prose-neutral mt-8 max-w-none whitespace-pre-wrap">{a.body_md}</article>
    </main>
  );
}
