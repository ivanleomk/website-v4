import { estimateReadTime, getAllPosts } from "@/lib/blog";
import { Navigation } from "@/components/Navigation";
import Link from "next/link";
import { Suspense } from "react";

export default async function BlogPage() {
  const posts = await getAllPosts();

  const sortedPosts = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const allCategories = Array.from(
    new Set(posts.flatMap((post) => post.categories))
  ).sort();

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        <header id="blog-header" className="mb-20 border-b border-gray-200 pb-12">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-5xl md:text-6xl font-serif font-medium tracking-tight mb-6 text-black">
                Articles
              </h1>
              <p className="text-xl md:text-2xl text-gray-500 font-serif leading-relaxed max-w-2xl">
                {posts.length} articles on language models, agents, and software
                design.
              </p>
            </div>
            <a
              href="/rss.xml"
              className="inline-flex items-center gap-2 text-sm font-sans text-gray-500 hover:text-black transition-colors"
            >
              RSS
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </header>

        {/* Category Filter */}
        <Suspense fallback={<div className="h-8 animate-pulse bg-gray-100 rounded" />}>
          <div className="mb-12 flex flex-wrap gap-2">
            <Link
              href="/blog"
              className="px-3 py-1 text-sm font-sans rounded-full bg-black text-white"
            >
              All
            </Link>
            {allCategories.map((category) => (
              <Link
                key={category}
                href={`/blog?category=${encodeURIComponent(category)}`}
                className="px-3 py-1 text-sm font-sans rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                {category}
              </Link>
            ))}
          </div>
        </Suspense>

        {/* Articles List */}
        <div className="space-y-8 md:space-y-12">
          {sortedPosts.map((post) => (
            <article key={post.slug} className="group">
              <Link href={`/blog/${post.slug}`} className="block">
                <h3 className="text-xl md:text-2xl font-serif font-medium mb-2 group-hover:text-gray-600 transition-colors text-black">
                  {post.title}
                </h3>
                <p className="text-gray-500 font-serif leading-relaxed mb-3 text-sm md:text-base">
                  {post.description}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-sans text-gray-500">
                  <span>
                    {new Date(post.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span>{estimateReadTime(post.content)}</span>
                  {post.series && post.series.length > 0 && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="text-black font-medium">
                        {post.series[0]}
                      </span>
                    </>
                  )}
                </div>
              </Link>
            </article>
          ))}
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
