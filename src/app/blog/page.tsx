import { getAllPosts } from "@/lib/blog";
import { Navigation } from "@/components/Navigation";
import { BlogCard } from "@/components/BlogCard";

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <div className="bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-12">
          <h1 className="text-6xl font-bold mb-4 text-black">Articles</h1>
          <p className="text-xl text-gray-600 max-w-2xl">
            Random musings about working with language models.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="text-gray-600">No posts found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full">
            {posts.map((post) => (
              <BlogCard
                key={post.title}
                slug={post.slug}
                title={post.title}
                description={post.description || ""}
                imageUrl={post.image || "/article_1.png"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
