import Link from "next/link";
import { SeriesInfo } from "@/lib/series";
import { formatDate } from "@/lib/markdown";
import { NewsletterSignup } from "./NewsletterSignup";
import { ArrowRight, Layers } from "lucide-react";

interface SeriesNavigationProps {
  seriesInfo: SeriesInfo;
}

export function SeriesNavigation({ seriesInfo }: SeriesNavigationProps) {
  const { name, description, posts, currentIndex } = seriesInfo;

  return (
    <div className="border border-gray-200 rounded-lg p-6 mb-12 bg-gray-50">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-sans font-bold uppercase tracking-widest text-gray-500">
            Series
          </span>
        </div>
        <h3 className="text-lg font-serif font-medium text-black mb-2">
          {name}
        </h3>
        <p className="text-sm text-gray-500 font-sans leading-relaxed">
          {description}
        </p>
      </div>

      <div className="space-y-2 border-t border-gray-200 pt-4">
        {posts.map((post, index) => {
          const isCurrent = index === currentIndex;
          const isCompleted = index < currentIndex;

          return (
            <div key={post.slug} className="flex items-center gap-3">
              <div className="flex items-center justify-center w-6 flex-shrink-0">
                <span
                  className={`font-mono text-xs ${
                    isCurrent
                      ? "text-black font-medium"
                      : isCompleted
                        ? "text-gray-400"
                        : "text-gray-400"
                  }`}
                >
                  {(index + 1).toString().padStart(2, "0")}
                </span>
              </div>

              {isCurrent ? (
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-black">
                      {post.title}
                    </div>
                    <div className="text-xs text-gray-500 font-sans">
                      {formatDate(post.date)}
                    </div>
                  </div>
                  <span className="text-xs bg-black text-white px-2 py-0.5 rounded font-sans">
                    Current
                  </span>
                </div>
              ) : (
                <Link href={`/blog/${post.slug}`} className="flex-1 group">
                  <div
                    className={`text-sm font-sans ${
                      isCompleted ? "text-gray-400" : "text-gray-600"
                    } group-hover:text-black transition-colors`}
                  >
                    {post.title}
                  </div>
                  <div className="text-xs text-gray-400 font-sans">
                    {formatDate(post.date)}
                  </div>
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {currentIndex < posts.length - 1 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Link
            href={`/blog/${posts[currentIndex + 1].slug}`}
            className="inline-flex items-center gap-2 text-sm text-black hover:text-gray-600 transition-colors group font-sans"
          >
            <span>Next:</span>
            <span className="font-medium">{posts[currentIndex + 1].title}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <NewsletterSignup />
      </div>
    </div>
  );
}
