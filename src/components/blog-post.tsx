"use client";

import { BlogPost, formatDate } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import GithubSlugger from "github-slugger";

interface BlogPostProps {
  post: BlogPost;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");
  const [isHovered, setIsHovered] = useState(true);

  useEffect(() => {
    const updateActiveHeading = () => {
      const headingElements = items.map(({ id }) => ({
        id,
        element: document.getElementById(id)
      })).filter(({ element }) => element !== null);

      if (headingElements.length === 0) return;

      // Find the heading closest to the top of the viewport
      const scrollY = window.scrollY + 100; // Add offset for better UX
      let activeHeading = headingElements[0];
      
      // Find the last heading that's above the current scroll position
      for (let i = headingElements.length - 1; i >= 0; i--) {
        const element = headingElements[i].element!;
        if (element.offsetTop <= scrollY) {
          activeHeading = headingElements[i];
          break;
        }
      }

      setActiveId(activeHeading.id);
    };

    updateActiveHeading();
    window.addEventListener('scroll', updateActiveHeading, { passive: true });
    return () => window.removeEventListener('scroll', updateActiveHeading);
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="fixed right-8 top-1/2 transform -translate-y-1/2 z-10 hidden xl:block">
      <motion.nav
        className="bg-black/90 backdrop-blur-sm py-4 rounded-full px-4"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{
          paddingLeft: isHovered ? "1rem" : "0.75rem",
          paddingRight: isHovered ? "1rem" : "0.75rem",
        }}
        style={{
          borderRadius: "1.5rem",
        }}
        transition={{
          duration: 0.4,
          ease: "easeInOut",
        }}
      >
        <ul className="space-y-1.5">
          {items.map(({ id, text, level }) => {
            const isActive = activeId === id;
            const lineLength =
              level === 2 ? "w-8" : level === 3 ? "w-6" : "w-4";

            return (
              <li key={id} className="flex items-center">
                <motion.a
                  href={`#${id}`}
                  className="flex items-center justify-between w-full group"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(id)?.scrollIntoView({
                      behavior: "smooth",
                    });
                  }}
                  transition={{
                    duration: 0.2,
                    ease: "easeInOut",
                  }}
                >
                  <motion.div
                    className={`text-xs whitespace-nowrap py-0.5 text-right transition-colors duration-200 w-[200px] ${
                      isActive
                        ? "text-white"
                        : "text-gray-400 group-hover:text-white"
                    }`}
                    animate={{
                      opacity: isHovered ? 1 : 0,
                      width: isHovered ? "auto" : 0,
                    }}
                    transition={{
                      duration: 0.2,
                      ease: "easeInOut",
                    }}
                  >
                    <div className="truncate text-left w-[150px] mr-10">
                      {text.trimStart()}
                    </div>
                  </motion.div>
                  <div
                    className={`h-0.5 bg-gray-400 ${
                      isHovered ? ` ${lineLength}` : `w-4`
                    }`}
                  />
                </motion.a>
              </li>
            );
          })}
        </ul>
      </motion.nav>
    </div>
  );
}

export function BlogPostComponent({ post }: BlogPostProps) {
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
      <TableOfContents items={tocItems} />
      <article className="max-w-3xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-4 text-black">{post.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            {post.authors.length > 0 && (
              <span>by {post.authors.join(", ")}</span>
            )}
          </div>
          {post.description && (
            <p className="text-base text-gray-700 mb-4">{post.description}</p>
          )}
          {post.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.categories.map((category) => (
                <span
                  key={category}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {category}
                </span>
              ))}
            </div>
          )}
        </header>
        <div
          className="prose prose-base max-w-none prose-headings:text-black prose-p:text-gray-800 prose-a:text-black prose-a:underline prose-strong:text-black prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </div>
  );
}
