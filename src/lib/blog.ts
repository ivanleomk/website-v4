import { BlogPost } from './markdown';
import { generateAllPosts } from './posts';

let cachedPosts: BlogPost[] | null = null;

export async function getAllPosts(): Promise<BlogPost[]> {
  if (cachedPosts) {
    return cachedPosts;
  }

  if (process.env.NODE_ENV !== 'production') {
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
