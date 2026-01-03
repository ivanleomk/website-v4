import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { BlogPost } from './markdown';

const isProduction = process.env.NODE_ENV === 'production';

export interface SeriesListItem {
  id: string;
  title: string;
  description: string;
  totalParts: number;
  status: 'In Progress';
  posts: BlogPost[];
}

export interface SeriesInfo {
  name: string;
  description: string;
  posts: BlogPost[];
  currentIndex: number;
}

export async function getSeriesDefinitions(): Promise<Record<string, string>> {
  if (isProduction) {
    return import('@/data/series.json')
      .then((m) => m.default)
      .catch(() => ({}));
  }

  const seriesPath = join(process.cwd(), 'content', 'series.json');
  if (!existsSync(seriesPath)) {
    return {};
  }

  const seriesContent = readFileSync(seriesPath, 'utf8');
  return JSON.parse(seriesContent) as Record<string, string>;
}

export function buildSeriesList(
  posts: BlogPost[],
  seriesDefinitions: Record<string, string>
): SeriesListItem[] {
  return Object.entries(seriesDefinitions).map(([name, description]) => {
    const seriesPosts = posts
      .filter((post) => post.series?.includes(name))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      title: name,
      description,
      totalParts: seriesPosts.length,
      status: 'In Progress' as const,
      posts: seriesPosts,
    };
  });
}

export function getSeriesInfo(posts: BlogPost[], currentSlug: string, seriesDefinitions: Record<string, string>): SeriesInfo | null {
  const currentPost = posts.find(post => post.slug === currentSlug);
  if (!currentPost?.series?.length) return null;

  const seriesName = currentPost.series[0]; // Use first series if multiple
  const description = seriesDefinitions[seriesName];
  
  if (!description) return null;

  // Find all posts in this series, sorted by date
  const seriesPosts = posts
    .filter(post => post.series?.includes(seriesName))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const currentIndex = seriesPosts.findIndex(post => post.slug === currentSlug);

  return {
    name: seriesName,
    description,
    posts: seriesPosts,
    currentIndex
  };
}
