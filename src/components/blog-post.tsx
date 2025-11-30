"use client";

import { BlogPost } from "@/lib/markdown";
import { useEffect, useState } from "react";
import GithubSlugger from "github-slugger";
import Link from "next/link";
import { Markdown } from "./Markdown";
import { SeriesNavigation } from "./SeriesNavigation";
import { SeriesInfo } from "@/lib/series";
import { NewsletterSignup } from "./NewsletterSignup";
import { ArticleTOC } from "./ArticleTOC";
import { ArrowLeft } from "lucide-react";

interface BlogPostProps {
  post: BlogPost;
  seriesInfo: SeriesInfo | null;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function estimateReadTime(content: string): string {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

export function BlogPostComponent({ post, seriesInfo }: BlogPostProps) {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);

  useEffect(() => {
    const headings = document.querySelectorAll("h2, h3, h4");
    const items: TocItem[] = [];
    const slugger = new GithubSlugger();

    headings.forEach((heading) => {
      const text = heading.textContent || "";
      const level = parseInt(heading.tagName.charAt(1));
      const id = slugger.slug(text);

      items.push({ id, text, level });
    });

    setTocItems(items);
  }, [post.content]);

  return (
    <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-xs md:text-sm font-sans text-gray-500 hover:text-black transition-colors mb-6 md:mb-12 group"
      >
        <ArrowLeft className="w-3 h-3 md:w-4 md:h-4 transition-transform group-hover:-translate-x-1" />
        Back to articles
      </Link>

      <article>
        {/* Header */}
        <header className="mb-8 md:mb-12 border-b border-gray-200 pb-8 md:pb-12">
          {/* Title */}
          <h1 className="text-3xl md:text-5xl font-serif font-medium tracking-tight mb-3 md:mb-4 leading-tight text-black">
            {post.title}
          </h1>

          {/* Description */}
          {post.description && (
            <p className="text-base md:text-xl text-gray-500 font-serif leading-relaxed mb-4 md:mb-6">
              {post.description}
            </p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm font-sans text-gray-500">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </time>
            <span className="text-gray-300">·</span>
            <span>{estimateReadTime(post.content)}</span>
            {post.series && post.series.length > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <Link
                  href={`/series#${post.series[0].toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-black font-medium hover:underline"
                >
                  {post.series[0]}
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Table of Contents - Mobile */}
        <div className="lg:hidden mb-12">
          <ArticleTOC items={tocItems} />
        </div>

        {/* Content Layout */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          {/* Sidebar TOC - Desktop */}
          <aside className="hidden lg:block lg:col-span-3 lg:sticky lg:top-24 lg:self-start">
            <ArticleTOC items={tocItems} />
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-9">
            {/* Series Navigation */}
            {seriesInfo && <SeriesNavigation seriesInfo={seriesInfo} />}

            {/* Newsletter Signup when no series */}
            {!seriesInfo && (
              <div className="border border-gray-200 rounded-lg p-6 mb-12 bg-gray-50">
                <NewsletterSignup variant="embedded" />
              </div>
            )}

            <Markdown content={post.content} />
          </div>
        </div>
      </article>
    </main>
  );
}
