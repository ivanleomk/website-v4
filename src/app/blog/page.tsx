import { getAllPosts } from "@/lib/blog";
import { Navigation } from "@/components/Navigation";
import { Posts } from "@/components/Posts";
import { CategoryLinks } from "@/components/CategoryLinks";
import { Suspense } from "react";

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <div className="bg-white min-h-screen">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-16">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-black mb-4">
            All Articles
          </h1>
          <p className="text-gray-500 mb-8">{posts.length} articles</p>
          <Suspense fallback={<div className="animate-pulse h-8" />}>
            <CategoryLinks />
          </Suspense>
        </header>

        <div id="posts">
          <Suspense fallback={<div>Loading posts...</div>}>
            <Posts posts={posts} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
