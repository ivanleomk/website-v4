import { BlogPost } from './markdown';
import { generateAllPosts } from './posts';
import { readFileSync } from 'fs';
import { join } from 'path';

let cachedPosts: BlogPost[] | null = null;

export async function getAllPosts(): Promise<BlogPost[]> {
  // In development, always regenerate to ensure hot reload works
  if (process.env.NODE_ENV === 'development') {
    try {
      // Try to read from static JSON first (faster)
      const postsPath = join(process.cwd(), 'src/data/posts.json');
      const postsData = JSON.parse(readFileSync(postsPath, 'utf8'));
      return postsData as BlogPost[];
    } catch {
      // Fallback to file system generation
      return await generateAllPosts();
    }
  }
  
  // Production: use caching
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
    return [];
  }
}
