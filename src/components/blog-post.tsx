import { BlogPost, formatDate } from '@/lib/markdown';

interface BlogPostProps {
  post: BlogPost;
}

export function BlogPostComponent({ post }: BlogPostProps) {
  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-black">{post.title}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          {post.authors.length > 0 && (
            <span>by {post.authors.join(', ')}</span>
          )}
        </div>
        {post.description && (
          <p className="text-lg text-gray-700 mb-4">{post.description}</p>
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
        className="prose prose-lg max-w-none prose-headings:text-black prose-p:text-gray-800 prose-a:text-black prose-a:underline prose-strong:text-black prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
