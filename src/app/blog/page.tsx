import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import { formatDate } from '@/lib/markdown';
import { Navigation } from '@/components/Navigation';

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <>
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-12">
        <h1 className="text-4xl font-bold mb-4 text-black">Blog</h1>
        <p className="text-lg text-gray-700 max-w-2xl">
          Thoughts on AI engineering, machine learning, and building better systems. 
          Writing about the practical challenges of deploying AI at scale.
        </p>
      </header>
      
      {posts.length === 0 ? (
        <p className="text-gray-600">No posts found.</p>
      ) : (
        <div className="space-y-8">
          {posts.map((post) => (
            <article key={post.slug} className="border-b border-gray-200 pb-8 last:border-b-0">
              <Link href={`/blog/${post.slug}`} className="group">
                <h2 className="text-2xl font-bold mb-2 text-black group-hover:underline">
                  {post.title}
                </h2>
              </Link>
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                {post.authors.length > 0 && (
                  <span>by {post.authors.join(', ')}</span>
                )}
              </div>

              {post.description && (
                <p className="text-gray-700 mb-3">{post.description}</p>
              )}

              {post.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.categories.map((category) => (
                    <span
                      key={category}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      </div>
    </>
  );
}
