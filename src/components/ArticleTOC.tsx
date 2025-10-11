"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function ArticleTOC({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const updateActiveHeading = () => {
      const headingElements = items
        .map(({ id }) => ({
          id,
          element: document.getElementById(id),
        }))
        .filter(({ element }) => element !== null);

      if (headingElements.length === 0) return;

      const scrollY = window.scrollY + 100;
      let activeHeading = headingElements[0];

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
    window.addEventListener("scroll", updateActiveHeading, { passive: true });
    return () => window.removeEventListener("scroll", updateActiveHeading);
  }, [items]);

  const filteredItems = items.filter(item => 
    !item.text.startsWith("Series:") && item.text !== "Stay Updated"
  );

  if (filteredItems.length === 0) return null;

  return (
    <div className="space-y-6">
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors duration-200 group sticky top-24 bg-gray-50 pb-4 z-10"
      >
        <svg
          className="h-4 w-4 transform group-hover:-translate-x-1 transition-transform duration-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to articles
      </Link>
      <nav>
        <h2 className="text-2xl font-bold mb-6 text-black">Table of Contents</h2>
        <ul className="space-y-4 lg:space-y-3">
          {filteredItems.map(({ id, text, level }) => {
            const isActive = activeId === id;
            const paddingLeft = level === 2 ? "pl-0" : level === 3 ? "pl-6" : "pl-12";

            return (
              <li key={id} className={paddingLeft}>
                <a
                  href={`#${id}`}
                  className={`inline-block text-base transition-colors duration-200 hover:text-black ${
                    isActive ? "text-black font-medium" : "text-gray-600"
                  }`}
                  style={{
                    textDecorationLine: "underline",
                    textDecorationStyle: "dotted",
                    textDecorationColor: "rgb(156, 163, 175)",
                    textDecorationThickness: "2px",
                    textUnderlineOffset: "4px",
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(id)?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                >
                  {text}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
