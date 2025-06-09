import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseMarkdown, BlogPost } from './markdown';

// This runs at build time only
export async function generateAllPosts(): Promise<BlogPost[]> {
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

    return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}

export async function generatePost(slug: string): Promise<BlogPost | null> {
  try {
    const postsDirectory = join(process.cwd(), 'content', 'blog');
    const fullPath = join(postsDirectory, `${slug}.md`);
    const fileContents = readFileSync(fullPath, 'utf8');
    return await parseMarkdown(fileContents, slug);
  } catch {
    return null;
  }
}

export function generateStaticSlugs(): string[] {
  try {
    const postsDirectory = join(process.cwd(), 'content', 'blog');
    const filenames = readdirSync(postsDirectory);
    
    return filenames
      .filter((name: string) => name.endsWith('.md'))
      .map((name: string) => name.replace(/\.md$/, ''));
  } catch {
    return [];
  }
}
