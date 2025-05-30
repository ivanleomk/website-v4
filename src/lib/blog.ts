import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseMarkdown, BlogPost } from './markdown';

export async function getAllPosts(): Promise<BlogPost[]> {
  try {
    const postsDirectory = join(process.cwd(), 'content', 'blog');
    const filenames = readdirSync(postsDirectory);
    
    const posts = await Promise.all(
      filenames
        .filter((name) => name.endsWith('.md'))
        .map(async (name) => {
          const slug = name.replace(/\.md$/, '');
          const fullPath = join(postsDirectory, name);
          const fileContents = readFileSync(fullPath, 'utf8');
          return await parseMarkdown(fileContents, slug);
        })
    );

    // Sort posts by date (newest first)
    return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}
