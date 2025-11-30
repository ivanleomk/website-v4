import { getAllPosts } from "@/lib/blog";
import { Navigation } from "@/components/Navigation";
import Link from "next/link";
import { ArrowRight, Layers, Clock } from "lucide-react";
import seriesDefinitions from "@/data/series.json";

function estimateReadTime(content: string): string {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

export default async function SeriesPage() {
  const posts = await getAllPosts();

  const seriesList = Object.entries(seriesDefinitions).map(
    ([name, description]) => {
      const seriesPosts = posts
        .filter((post) => post.series?.includes(name))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return {
        id: name.toLowerCase().replace(/\s+/g, "-"),
        title: name,
        description,
        totalParts: seriesPosts.length,
        status: "In Progress" as const,
        posts: seriesPosts,
      };
    }
  );

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        <header className="mb-20 border-b border-gray-200 pb-12">
          <h1 className="text-5xl md:text-6xl font-serif font-medium tracking-tight mb-6 text-black">
            Series
          </h1>
          <p className="text-xl md:text-2xl text-gray-500 font-serif leading-relaxed max-w-2xl">
            Structured learning paths and technical deep dives.{" "}
            <br className="hidden md:block" />
            Read them in order, like chapters in a book.
          </p>
        </header>

        <div className="space-y-32">
          {seriesList.map((s) => (
            <section key={s.id} id={s.id} className="group scroll-mt-24">
              {/* Series Header */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
                <div className="md:col-span-4">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-widest text-gray-500">
                      <Layers className="w-3 h-3" />
                      {s.totalParts} Parts
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span className="text-xs font-sans font-bold uppercase tracking-widest text-amber-600">
                      {s.status}
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif font-medium leading-tight text-black">
                    {s.title}
                  </h2>
                </div>
                <div className="md:col-span-8 md:pt-10">
                  <p className="text-lg text-gray-500 font-serif leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </div>

              {/* Syllabus / Chapter List */}
              <div className="border-t border-gray-200">
                {s.posts.map((post, index) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="block group/item border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-6 items-baseline">
                      {/* Part Number */}
                      <div className="md:col-span-2 flex items-center gap-3">
                        <span className="font-mono text-sm text-gray-500 group-hover/item:text-black transition-colors">
                          {(index + 1).toString().padStart(2, "0")}
                        </span>
                        <span className="h-px w-8 bg-gray-200 group-hover/item:bg-gray-400 transition-colors hidden md:block" />
                      </div>

                      {/* Title & Desc */}
                      <div className="md:col-span-8">
                        <h3 className="text-xl font-serif font-medium mb-2 group-hover/item:text-gray-600 transition-colors text-black">
                          {post.title}
                        </h3>
                        <p className="text-sm text-gray-500 font-sans line-clamp-2 md:line-clamp-1">
                          {post.description}
                        </p>
                      </div>

                      {/* Metadata */}
                      <div className="md:col-span-2 flex justify-end items-center gap-4 text-xs font-sans text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {estimateReadTime(post.content)}
                        </span>
                        <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all" />
                      </div>
                    </div>
                  </Link>
                ))}

                {/* Placeholder for future parts if series is in progress */}
                {s.status === "In Progress" && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-6 items-baseline border-b border-dashed border-gray-200 opacity-50">
                    <div className="md:col-span-2 flex items-center gap-3">
                      <span className="font-mono text-sm text-gray-500">
                        {(s.posts.length + 1).toString().padStart(2, "0")}
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
            </section>
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
