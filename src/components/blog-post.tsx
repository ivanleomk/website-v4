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

interface BlogPostProps {
  post: BlogPost;
  seriesInfo: SeriesInfo | null;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function BlogPostComponent({ post, seriesInfo }: BlogPostProps) {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);

  useEffect(() => {
    const headings = document.querySelectorAll("h2, h3");
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
    <div className="relative">
      {/* <TableOfContents items={tocItems} tocRef={tocRef} /> */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          <aside className="lg:col-span-3 lg:sticky lg:top-24 lg:self-start hidden lg:block">
            <ArticleTOC items={tocItems} />
          </aside>
          <article className="lg:col-span-9 pb-8 max-w-5xl mx-auto lg:mx-0 lg:px-0 px-4">
            <div className="lg:hidden">
              <ArticleTOC items={tocItems} />
            </div>
        <header className="mb-8">
          {/* Title */}
          <h1 className="text-6xl font-bold mb-8 text-black leading-tight">
            {post.title}
          </h1>

          {/* Description */}
          {post.description && (
            <p className="text-2xl text-gray-600 mb-8 leading-relaxed">
              {post.description}
            </p>
          )}

          {/* Horizontal Rule */}
          <hr className="border-gray-200 mb-8" />

          {/* Categories and Date */}
          <div className="flex flex-wrap justify-between items-start gap-4">
            {post.categories.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {post.categories.map((category) => (
                  <Link
                    key={category}
                    href={`/blog?tags=${encodeURIComponent(category)}#posts`}
                    className="text-gray-800 font-normal text-sm cursor-pointer relative inline-block group hover:-translate-y-0.5 transition-transform duration-300 ease-out"
                  >
                    {category}
                    <div className="absolute -bottom-1 left-0 h-0.5 bg-gray-800 rounded-full w-0 group-hover:w-1/2 transition-all duration-300 ease-out"></div>
                    <div className="absolute -bottom-1 right-0 h-0.5 bg-gray-800 rounded-full w-0 group-hover:w-1/2 transition-all duration-300 ease-out"></div>
                  </Link>
                ))}
              </div>
            )}
            <div className="text-gray-500 text-sm">
              <time dateTime={post.date}>
                {(() => {
                  const date = new Date(post.date);
                  const now = new Date();
                  const diffTime = Math.abs(now.getTime() - date.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  if (diffDays < 30) {
                    return `Written ${diffDays} day${
                      diffDays === 1 ? "" : "s"
                    } ago`;
                  } else if (diffDays < 365) {
                    const months = Math.floor(diffDays / 30);
                    return `Written ${months} month${
                      months === 1 ? "" : "s"
                    } ago`;
                  } else {
                    const years = Math.floor(diffDays / 365);
                    return `Written ${years} year${years === 1 ? "" : "s"} ago`;
                  }
                })()}
              </time>
            </div>
          </div>
        </header>
        
        {/* Series Navigation */}
        {seriesInfo && <SeriesNavigation seriesInfo={seriesInfo} />}
        
        {/* Newsletter Signup when no series */}
        {!seriesInfo && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <NewsletterSignup variant="embedded" />
          </div>
        )}
        
        <Markdown content={post.content} />
          </article>
        </div>
      </div>
    </div>
  );
}
