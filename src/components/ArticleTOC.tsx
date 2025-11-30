"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function ArticleTOC({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

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

  const filteredItems = items.filter(
    (item) => !item.text.startsWith("Series:") && item.text !== "Stay Updated"
  );

  if (filteredItems.length === 0) return null;

  const TocContent = () => (
    <ul className="space-y-2">
      {filteredItems.map(({ id, text, level }) => {
        const isActive = activeId === id;
        const paddingLeft =
          level === 2 ? "pl-0" : level === 3 ? "pl-4" : "pl-8";

        return (
          <li key={id} className={paddingLeft}>
            <a
              href={`#${id}`}
              className={`block text-sm font-sans leading-relaxed transition-colors duration-200 hover:text-black ${
                isActive ? "text-black font-medium" : "text-gray-500"
              }`}
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
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
  );

  return (
    <>
      {/* Mobile: Collapsible */}
      <nav className="lg:hidden border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 text-left"
        >
          <span className="text-xs font-sans font-bold uppercase tracking-widest text-gray-500">
            On this page
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {isOpen && (
          <div className="p-4 pt-0 bg-gray-50 max-h-64 overflow-y-auto">
            <TocContent />
          </div>
        )}
      </nav>

      {/* Desktop: Always visible */}
      <nav className="hidden lg:block">
        <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-gray-500 mb-4">
          On this page
        </h2>
        <TocContent />
      </nav>
    </>
  );
}
