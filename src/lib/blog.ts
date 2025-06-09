import { BlogPost } from './markdown';
import { generateAllPosts } from './posts';

let cachedPosts: BlogPost[] | null = null;

export async function getAllPosts(): Promise<BlogPost[]> {
  if (cachedPosts) {
    return cachedPosts;
  }
  
  // Try to load from pre-generated static data first
  try {
    // Use dynamic import with assertion for JSON
    const postsData = await import('../data/posts.json').then(m => m.default);
    cachedPosts = postsData as BlogPost[];
    return cachedPosts;
  } catch {
    // Fallback to file system (development only)
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    
    cachedPosts = await generateAllPosts();
    return cachedPosts;
  }
}
