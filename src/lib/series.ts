import { BlogPost } from './markdown';

export interface SeriesInfo {
  name: string;
  description: string;
  posts: BlogPost[];
  currentIndex: number;
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
