import matter from 'gray-matter';

export interface BlogPost {
  title: string;
  date: string;
  description: string;
  categories: string[];
  authors: string[];
  content: string;
  slug: string;
  image?: string;
  series?: string[];
}

export async function parseMarkdown(markdownContent: string, slug: string): Promise<BlogPost> {
  const { data, content } = matter(markdownContent);
  
  return {
    title: data.title || '',
    date: data.date || '',
    description: data.description || '',
    categories: data.categories || [],
    authors: data.authors || [],
    content: content, // Raw markdown content for react-markdown
    slug,
    image: data.image,
    series: data.series || [],
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
