import { BlogPost } from './markdown';
import { generateAllPosts } from './posts';
import { unstable_noStore as noStore } from 'next/cache';

let cachedPosts: BlogPost[] | null = null;

export async function getAllPosts(): Promise<BlogPost[]> {
  if (cachedPosts) {
    return cachedPosts;
  }

  if (process.env.NODE_ENV !== 'production') {
    noStore();
    return generateAllPosts();
  }

  const postsData = await import('../data/posts.json')
    .then((m) => m.default as BlogPost[])
    .catch(() => null);

  if (!postsData) {
    return [];
  }

  cachedPosts = postsData;
  return cachedPosts;
}

export function estimateReadTime(content: string): string {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}
