"use client";

import { BlogPost } from "@/lib/markdown";
import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import GithubSlugger from "github-slugger";
import Link from "next/link";
import { Markdown } from "./Markdown";

interface BlogPostProps {
  post: BlogPost;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function TableOfContents({
  items,
  tocRef,
}: {
  items: TocItem[];
  tocRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [activeId, setActiveId] = useState<string>("");
  const [isHovered, setIsHovered] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const updateActiveHeading = () => {
      const headingElements = items
        .map(({ id }) => ({
          id,
          element: document.getElementById(id),
        }))
        .filter(({ element }) => element !== null);

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

    const updateScrollProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(
        Math.max((scrollTop / docHeight) * 100, 0),
        100
      );
      setScrollProgress(progress);
    };

    const updateBoth = () => {
      updateActiveHeading();
      updateScrollProgress();
    };

    updateBoth();
    window.addEventListener("scroll", updateBoth, { passive: true });
    return () => window.removeEventListener("scroll", updateBoth);
  }, [items]);

  if (items.length === 0) return null;

  const shouldShowProgress = scrollProgress > 0.5;

  // Calculate ejection offset based on scroll progress
  const ejectionProgress = Math.max(
    0,
    Math.min((scrollProgress - 0.5) / 0.4, 1)
  );
  const ejectionOffset = ejectionProgress * -48; // Move up to -60px when fully ejected

  return (
    <div className="fixed right-8 top-1/2 transform -translate-y-1/2 z-10 hidden xl:block">
      {/* Reading Progress Circle */}
      <div className="absolute top-0 -right-0">
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: shouldShowProgress ? 1 : 0,
            scale: shouldShowProgress ? 1 : 0.8,
            y: shouldShowProgress ? ejectionOffset : 20,
          }}
          transition={{
            duration: 0.4,
            ease: "easeOut",
          }}
        >
          <div className="relative w-10 h-10 ">
            <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgb(229, 231, 235)"
                strokeWidth="2"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeDasharray={`${scrollProgress}, 100`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center bg-black rounded-full">
              <span className="text-xs font-medium text-white">
                {Math.round(scrollProgress)}%
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.nav
        ref={tocRef}
        className="bg-black/90 backdrop-blur-sm py-4 rounded-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{
          paddingLeft: isHovered ? "1rem" : "0.75rem",
          paddingRight: isHovered ? "1rem" : "0.75rem",
        }}
        initial={{
          paddingLeft: "0.75rem",
          paddingRight: "0.75rem",
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
                    className={`text-xs whitespace-nowrap py-0.5 text-right transition-colors duration-200 overflow-hidden ${
                      isActive
                        ? "text-white"
                        : "text-gray-400 group-hover:text-white"
                    }`}
                    initial={{ opacity: 0, width: 0 }}
                    animate={{
                      opacity: isHovered ? 1 : 0,
                      width: isHovered ? "200px" : 0,
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
  const tocRef = useRef<HTMLDivElement>(null);

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
      <TableOfContents items={tocItems} tocRef={tocRef} />
      <article className="max-w-5xl mx-auto px-4 pb-8">
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
        <Markdown content={post.content} />
      </article>
    </div>
  );
}
