import Link from 'next/link';
import { SeriesInfo } from '@/lib/series';
import { formatDate } from '@/lib/markdown';

interface SeriesNavigationProps {
  seriesInfo: SeriesInfo;
}

export function SeriesNavigation({ seriesInfo }: SeriesNavigationProps) {
  const { name, description, posts, currentIndex } = seriesInfo;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0" />
        <div>
          <h3 className="text-lg font-semibold text-black mb-2">
            Series: {name}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            {description}
          </p>
        </div>
      </div>
      
      <div className="space-y-2">
        {posts.map((post, index) => {
          const isCurrent = index === currentIndex;
          const isCompleted = index < currentIndex;
          
          return (
            <div key={post.slug} className="flex items-center gap-3">
              <div className="flex items-center justify-center w-6 h-6 flex-shrink-0">
                {isCompleted ? (
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                ) : isCurrent ? (
                  <div className="w-3 h-3 bg-black rounded-full" />
                ) : (
                  <div className="w-3 h-3 border-2 border-gray-300 rounded-full" />
                )}
              </div>
              
              {isCurrent ? (
                <div className="flex-1">
                  <div className="font-medium text-black">{post.title}</div>
                  <div className="text-xs text-gray-500">{formatDate(post.date)}</div>
                </div>
              ) : (
                <Link
                  href={`/blog/${post.slug}`}
                  className="flex-1 group"
                >
                  <div className="font-medium text-gray-700 group-hover:text-black transition-colors">
                    {post.title}
                  </div>
                  <div className="text-xs text-gray-500">{formatDate(post.date)}</div>
                </Link>
              )}
              
              {isCurrent && (
                <span className="text-xs bg-black text-white px-2 py-1 rounded-full">
                  Current
                </span>
              )}
            </div>
          );
        })}
      </div>
      
      {currentIndex < posts.length - 1 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Link
            href={`/blog/${posts[currentIndex + 1].slug}`}
            className="inline-flex items-center gap-2 text-sm text-black hover:text-gray-700 transition-colors group"
          >
            <span>Next in series:</span>
            <span className="font-medium group-hover:underline">
              {posts[currentIndex + 1].title}
            </span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
