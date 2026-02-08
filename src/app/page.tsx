import { getAllPosts } from "@/lib/blog";
import { buildSeriesList, getSeriesDefinitions } from "@/lib/series";
import { Navigation } from "@/components/Navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default async function Home() {
  const posts = await getAllPosts();
  const seriesDefinitions = await getSeriesDefinitions();

  const sortedPosts = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const seriesList = buildSeriesList(posts, seriesDefinitions);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        {/* Hero Section */}
        <section className="mb-20 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight mb-6 leading-tight text-black">
            Exploring the frontiers of{" "}
            <span className="italic">language models</span>,{" "}
            <span className="italic">agents</span>, and{" "}
            <span className="italic">software design</span>.
          </h1>
          <p className="text-xl text-gray-500 font-serif leading-relaxed mb-4">
            A collection of notes, essays, and technical deep dives by Ivan Leo.
          </p>
          <p className="text-base text-gray-500 font-sans">
            Previously built general agents for knowledge work at{" "}
            <a
              href="https://manus.im"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black font-medium hover:underline"
            >
              Manus
            </a>
            {" "}(acq by Meta). Embarking on a new adventure soon.
          </p>
        </section>

        {/* Featured Series Section */}
        <section className="mb-24">
          <div className="flex items-baseline justify-between mb-8 border-b border-gray-200 pb-4">
            <h2 className="text-sm font-sans font-bold uppercase tracking-widest text-gray-500">
              Featured Series
            </h2>
            <Link
              href="/series"
              className="text-sm font-sans font-medium hover:text-black flex items-center gap-1 group text-gray-600"
            >
              View all series
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
            {seriesList.slice(0, 2).map((s) => (
              <Link
                key={s.id}
                href={`/series#${s.id}`}
                className="group block h-full"
              >
                <div className="h-full flex flex-col">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-sans font-medium bg-gray-100 text-gray-700">
                      {s.totalParts} Parts
                    </span>
                    <span className="text-xs font-sans font-medium text-amber-600">
                      {s.status}
                    </span>
                  </div>
                  <h3 className="text-2xl font-serif font-medium mb-3 group-hover:text-gray-600 transition-colors leading-tight text-black">
                    {s.title}
                  </h3>
                  <p className="text-gray-500 font-serif leading-relaxed mb-6 flex-grow">
                    {s.description}
                  </p>
                  <div className="mt-auto text-sm font-sans font-medium text-black flex items-center gap-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    Start Reading <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Latest Articles Section */}
        <section>
          <div className="flex items-baseline justify-between mb-8 border-b border-gray-200 pb-4">
            <h2 className="text-sm font-sans font-bold uppercase tracking-widest text-gray-500">
              Latest Articles
            </h2>
            <Link
              href="/blog"
              className="text-sm font-sans font-medium hover:text-black flex items-center gap-1 group text-gray-600"
            >
              Archive
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="space-y-8 md:space-y-12">
            {sortedPosts.slice(0, 8).map((post) => (
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
        </section>
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
