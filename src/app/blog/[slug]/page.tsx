import { generatePost, generateStaticSlugs, generateAllPosts } from "@/lib/posts";
import { BlogPostComponent } from "@/components/blog-post";
import { Navigation } from "@/components/Navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { getSeriesInfo } from "@/lib/series";
import { readFileSync } from 'fs';
import { join } from 'path';

interface BlogPageProps {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  // Try to load from pre-generated static data first
  try {
    const postData = await import(`@/data/posts/${slug}.json`).then(m => m.default);
    return postData;
  } catch {
    // Fallback to file system (development only)
    if (process.env.NODE_ENV === 'production') {
      return null;
    }
    
    return await generatePost(slug);
  }
}

async function getAllPosts() {
  // Try to load from pre-generated static data first
  try {
    const postsData = await import(`@/data/posts.json`).then(m => m.default);
    return postsData;
  } catch {
    // Fallback to file system (development only)
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    
    return await generateAllPosts();
  }
}

async function getSeriesDefinitions(): Promise<Record<string, string>> {
  // Try to load from pre-generated static data first
  try {
    const seriesData = await import(`@/data/series.json`).then(m => m.default);
    return seriesData;
  } catch {
    // Fallback to file system (development only)
    if (process.env.NODE_ENV === 'production') {
      return {};
    }
    
    try {
      const seriesPath = join(process.cwd(), 'content', 'series.json');
      const seriesContent = readFileSync(seriesPath, 'utf8');
      return JSON.parse(seriesContent);
    } catch {
      return {};
    }
  }
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { slug } = await params;
  const [post, allPosts, seriesDefinitions] = await Promise.all([
    getPost(slug),
    getAllPosts(),
    getSeriesDefinitions()
  ]);

  if (!post) {
    notFound();
  }

  const seriesInfo = getSeriesInfo(allPosts, slug, seriesDefinitions);

  return (
    <div className="bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors duration-200 mb-8 group"
        >
          <svg
            className="h-4 w-4 transform group-hover:-translate-x-1 transition-transform duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to articles
        </Link>
      </div>
      <BlogPostComponent post={post} seriesInfo={seriesInfo} />
      <div className="h-32"></div>
    </div>
  );
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: 'Post Not Found',
      description: 'The requested blog post could not be found.',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ivanleo.com';
  
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: post.authors,
      url: `${baseUrl}/blog/${slug}`,
      siteName: 'Ivan Leo',
      images: [
        {
          url: `${baseUrl}/blog/${slug}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [`${baseUrl}/blog/${slug}/opengraph-image`],
    },
  };
}

export async function generateStaticParams() {
  const slugs = generateStaticSlugs();
  return slugs.map((slug) => ({ slug }));
}
