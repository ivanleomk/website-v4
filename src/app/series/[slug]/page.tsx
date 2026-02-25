import { estimateReadTime, getAllPosts } from "@/lib/blog";
import { getSeriesBySlug, getSeriesDefinitions } from "@/lib/series";
import { Navigation } from "@/components/Navigation";
import Link from "next/link";
import { ArrowRight, Layers, Clock } from "lucide-react";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const seriesDefinitions = await getSeriesDefinitions();
  return Object.keys(seriesDefinitions).map((name) => ({
    slug: name.toLowerCase().replace(/\s+/g, "-"),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const posts = await getAllPosts();
  const seriesDefinitions = await getSeriesDefinitions();
  const series = getSeriesBySlug(posts, seriesDefinitions, slug);

  if (!series) return {};

  return {
    title: series.title,
    description: series.description,
  };
}

function getSnippet(content: string, maxLength = 200): string {
  // Strip markdown syntax for a clean snippet
  const plain = content
    .replace(/^#{1,6}\s+.*$/gm, "") // headings
    .replace(/!\[.*?\]\(.*?\)/g, "") // images
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1") // links -> text
    .replace(/[`*_~>]/g, "") // inline formatting
    .replace(/```[\s\S]*?```/g, "") // code blocks
    .replace(/\n{2,}/g, "\n") // collapse newlines
    .trim();

  if (plain.length <= maxLength) return plain;
  return plain.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
}

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const posts = await getAllPosts();
  const seriesDefinitions = await getSeriesDefinitions();
  const series = getSeriesBySlug(posts, seriesDefinitions, slug);

  if (!series) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        <header className="mb-16 border-b border-gray-200 pb-12">
          <div className="mb-6">
            <Link
              href="/series"
              className="text-sm font-sans text-gray-500 hover:text-black transition-colors"
            >
              ← All Series
            </Link>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-widest text-gray-500">
              <Layers className="w-3 h-3" />
              {series.totalParts} Parts
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="text-xs font-sans font-bold uppercase tracking-widest text-amber-600">
              {series.status}
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-serif font-medium tracking-tight mb-6 text-black">
            {series.title}
          </h1>
          <p className="text-md text-gray-500 font-serif leading-relaxed">
            {series.description}
          </p>
        </header>

        <div className="border-t border-gray-200">
          {series.posts.map((post, index) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block group border-b border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-8 items-baseline">
                {/* Part Number */}
                <div className="md:col-span-2 flex items-center gap-3">
                  <span className="font-mono text-sm text-gray-500 group-hover:text-black transition-colors">
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                  <span className="h-px w-8 bg-gray-200 group-hover:bg-gray-400 transition-colors hidden md:block" />
                </div>

                {/* Title, Description & Snippet */}
                <div className="md:col-span-8">
                  <h3 className="text-xl font-serif font-medium mb-2 group-hover:text-gray-600 transition-colors text-black">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-500 font-sans mb-3">
                    {post.description}
                  </p>
                  <p className="text-sm text-gray-400 font-sans leading-relaxed line-clamp-3">
                    {getSnippet(post.content)}
                  </p>
                </div>

                {/* Metadata */}
                <div className="md:col-span-2 flex justify-end items-center gap-4 text-xs font-sans text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {estimateReadTime(post.content)}
                  </span>
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
              </div>
            </Link>
          ))}

          {/* Placeholder for future parts if series is in progress */}
          {series.status !== "Completed" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-8 items-baseline border-b border-dashed border-gray-200 opacity-50">
              <div className="md:col-span-2 flex items-center gap-3">
                <span className="font-mono text-sm text-gray-500">
                  {(series.posts.length + 1).toString().padStart(2, "0")}
                </span>
                <span className="h-px w-8 bg-gray-200 hidden md:block" />
              </div>
              <div className="md:col-span-8">
                <h3 className="text-xl font-serif font-medium mb-1 text-gray-400 italic">
                  Coming Soon
                </h3>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 mt-16">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-sans text-gray-500">
          <p>© {new Date().getFullYear()} Ivan Leo. All rights reserved.</p>
          <div className="flex gap-6">
            <a
              href="https://twitter.com/ivanleomk"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black transition-colors"
            >
              Twitter
            </a>
            <a
              href="https://github.com/ivanleomk"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
