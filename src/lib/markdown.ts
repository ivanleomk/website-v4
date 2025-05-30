import { remark } from 'remark';
import html from 'remark-html';
import matter from 'gray-matter';

export interface BlogPost {
  title: string;
  date: string;
  description: string;
  categories: string[];
  authors: string[];
  content: string;
  slug: string;
}

export async function parseMarkdown(markdownContent: string, slug: string): Promise<BlogPost> {
  const { data, content } = matter(markdownContent);
  
  const processedContent = await remark()
    .use(html)
    .process(content);
  
  const htmlContent = processedContent.toString();
  
  return {
    title: data.title || '',
    date: data.date || '',
    description: data.description || '',
    categories: data.categories || [],
    authors: data.authors || [],
    content: htmlContent,
    slug,
  };
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
