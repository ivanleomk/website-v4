import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { BlogPost } from './markdown';

const isProduction = process.env.NODE_ENV === 'production';

export type SeriesStatus = 'in-progress' | 'completed';

export interface SeriesDefinition {
  description: string;
  status: SeriesStatus;
}

export interface SeriesListItem {
  id: string;
  title: string;
  description: string;
  totalParts: number;
  status: 'In Progress' | 'Completed';
  posts: BlogPost[];
}

export interface SeriesInfo {
  name: string;
  description: string;
  posts: BlogPost[];
  currentIndex: number;
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

function displayStatus(status: SeriesStatus): 'In Progress' | 'Completed' {
  return status === 'completed' ? 'Completed' : 'In Progress';
}

export async function getSeriesDefinitions(): Promise<Record<string, SeriesDefinition>> {
  if (isProduction) {
    return import('@/data/series.json')
      .then((m) => m.default as unknown as Record<string, SeriesDefinition>)
      .catch(() => ({}));
  }

  const seriesPath = join(process.cwd(), 'content', 'series.json');
  if (!existsSync(seriesPath)) {
    return {};
  }

  const seriesContent = readFileSync(seriesPath, 'utf8');
  return JSON.parse(seriesContent) as Record<string, SeriesDefinition>;
}

export function buildSeriesList(
  posts: BlogPost[],
  seriesDefinitions: Record<string, SeriesDefinition>
): SeriesListItem[] {
  return Object.entries(seriesDefinitions).map(([name, def]) => {
    const seriesPosts = posts
      .filter((post) => post.series?.includes(name))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      id: toSlug(name),
      title: name,
      description: def.description,
      totalParts: seriesPosts.length,
      status: displayStatus(def.status),
      posts: seriesPosts,
    };
  });
}

export function getSeriesBySlug(
  posts: BlogPost[],
  seriesDefinitions: Record<string, SeriesDefinition>,
  slug: string
): SeriesListItem | null {
  const entry = Object.entries(seriesDefinitions).find(
    ([name]) => toSlug(name) === slug
  );
  if (!entry) return null;

  const [name, def] = entry;
  const seriesPosts = posts
    .filter((post) => post.series?.includes(name))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    id: toSlug(name),
    title: name,
    description: def.description,
    totalParts: seriesPosts.length,
    status: displayStatus(def.status),
    posts: seriesPosts,
  };
}

export function getSeriesInfo(posts: BlogPost[], currentSlug: string, seriesDefinitions: Record<string, SeriesDefinition>): SeriesInfo | null {
  const currentPost = posts.find(post => post.slug === currentSlug);
  if (!currentPost?.series?.length) return null;

  const seriesName = currentPost.series[0]; // Use first series if multiple
  const def = seriesDefinitions[seriesName];
  
  if (!def) return null;

  // Find all posts in this series, sorted by date
  const seriesPosts = posts
    .filter(post => post.series?.includes(seriesName))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const currentIndex = seriesPosts.findIndex(post => post.slug === currentSlug);

  return {
    name: seriesName,
    description: def.description,
    posts: seriesPosts,
    currentIndex
  };
}
