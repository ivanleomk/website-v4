"use client";

import { useRouter, useSearchParams } from "next/navigation";

const categories = [
  "RAG",
  "Voice",
  "Personal Development",
  "Synthetic Data",
  "LLM",
  "Applied AI",
  "Evals",
  "MCP",
  "Agents",
];

export function CategoryLinks() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleCategoryClick = (category: string) => {
    const params = new URLSearchParams(searchParams);
    const currentTags = params.get("tags")?.split(",").filter(Boolean) || [];

    if (!currentTags.includes(category.toLowerCase())) {
      const newTags = [...currentTags, category.toLowerCase()];
      params.set("tags", newTags.join(","));
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });

    // Scroll to posts section
    setTimeout(() => {
      const postsElement = document.getElementById("posts");
      if (postsElement) {
        postsElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  return (
    <div className="flex flex-wrap gap-3 items-start justify-start">
      {categories.map((category) => (
        <div
          key={category}
          className="sketchy-wrapper relative inline-block group"
        >
          <button
            onClick={() => handleCategoryClick(category)}
            className="inline-block px-4 py-2 text-gray-700 hover:text-gray-900 text-lg font-medium"
          >
            {category}
          </button>

          {/* 
            SVG "hand-sketch" ellipse, rotated by 30°. 
            - Using viewBox 0 0 100 100 with r=45 leaves a 5-unit margin inside.
            - When stretched (preserveAspectRatio="none"), this circle → ellipse that fills the link's box.
            - transform="rotate(30 50 50)" spins it 30° around the center point (50,50).
          */}
          <svg
            className="sketchy-circle absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <filter id="roughStroke">
                <feTurbulence
                  type="turbulence"
                  baseFrequency="0.03"
                  numOctaves="2"
                  result="turb"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="turb"
                  scale="2"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>

            {/* 
              Circle of radius 45, rotated 30° around (50,50).
              New circumference = 2·π·45 ≈ 282.74 
            */}
            <circle
              className="circle-path"
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#4B5563"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#roughStroke)"
              transform="rotate(30 50 50)"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
