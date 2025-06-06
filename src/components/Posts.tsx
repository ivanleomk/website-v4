"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface Post {
  title: string;
  slug: string;
  description: string;
  categories?: string[];
}

interface PostsProps {
  posts: Post[];
}

export function Posts({ posts }: PostsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filteredPosts = useMemo(() => {
    let filtered = posts;

    if (searchTerm) {
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          post.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((post) =>
        post.categories?.some((category) => selectedTags.includes(category))
      );
    }

    return filtered;
  }, [posts, searchTerm, selectedTags]);

  const handleTagClick = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const clearFilters = () => {
    setSelectedTags([]);
  };

  const getSectionTitle = () => {
    if (selectedTags.length === 1) {
      return `Posts tagged as ${selectedTags[0]}`;
    } else if (selectedTags.length > 1) {
      return `Posts tagged as ${selectedTags.slice(0, -1).join(", ")} or ${
        selectedTags[selectedTags.length - 1]
      }`;
    }
    return "All Articles";
  };

  return (
    <div className="pt-12">
      {/* Search Bar */}
      <div className="mb-8 flex justify-center">
        <div className="relative w-full max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-none focus:outline-none focus:border-black transition-colors duration-200 bg-white"
          />
        </div>
      </div>

      {/* Active Filter Display */}
      {(selectedTags.length > 0 || searchTerm) && (
        <div className="mb-6 flex items-center justify-center gap-4">
          <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 border border-gray-200 rounded-full">
            {searchTerm && (
              <span className="text-sm text-gray-600">
                Searching: &ldquo;{searchTerm}&rdquo;
              </span>
            )}
            {selectedTags.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Filtering by:</span>
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-full"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={clearFilters}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Section Title */}
      <div className="mb-8 text-center">
        <h2 className="text-4xl font-bold text-black">{getSectionTitle()}</h2>
        <div className="mt-3 flex items-center justify-center gap-4">
          <div className="h-[1px] bg-gray-200 w-16"></div>
          <span className="text-gray-400 text-sm">
            {filteredPosts.length} article
            {filteredPosts.length !== 1 ? "s" : ""}
          </span>
          <div className="h-[1px] bg-gray-200 w-16"></div>
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-400 mb-4">
            <svg
              className="h-16 w-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.462-.881-6.065-2.328C5.584 12.248 5.277 12 4.95 12H4a2 2 0 01-2-2V6a2 2 0 012-2h.95c.327 0 .634.248.985.672C7.538 6.119 9.66 7 12 7s4.462-.881 6.065-2.328C18.416 4.248 18.723 4 19.05 4H20a2 2 0 012 2v4a2 2 0 01-2 2h-.95c-.327 0-.634-.248-.985-.672z"
              />
            </svg>
          </div>
          <p className="text-gray-600 text-lg">No articles found</p>
          <p className="text-gray-400 text-sm mt-2">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
            <Link
              key={post.title}
              href={`/blog/${post.slug}`}
              className="group block bg-white p-6 transition-all duration-200  h-80 flex flex-col"
            >
              <div className="mb-4 flex gap-2 flex-wrap h-16 overflow-hidden">
                {post.categories?.map((category) => (
                  <button
                    key={category}
                    onClick={(e) => {
                      e.preventDefault();
                      handleTagClick(category);
                    }}
                    className={`inline-block px-3 py-1 text-xs border transition-colors duration-200 uppercase tracking-wide font-medium rounded-full h-fit ${
                      selectedTags.includes(category)
                        ? "bg-gray-900 text-white border-gray-900"
                        : "text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="mb-4 h-16 flex items-start">
                <h3 className="text-xl font-bold text-black leading-tight group-hover:text-gray-800 transition-colors line-clamp-2">
                  {post.title}
                </h3>
              </div>
              <div className="mb-6 flex-1">
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                  {post.description.length > 120
                    ? post.description.slice(0, 120) + "..."
                    : post.description || ""}
                </p>
              </div>
              <div className="flex items-center text-black text-sm font-medium mt-auto">
                <span className="mr-2">Read article</span>
                <svg
                  className="h-4 w-4 transform group-hover:translate-x-1 transition-transform duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
