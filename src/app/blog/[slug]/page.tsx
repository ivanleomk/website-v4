import { generatePost, generateStaticSlugs } from "@/lib/posts";
import { BlogPostComponent } from "@/components/blog-post";
import { Navigation } from "@/components/Navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";

interface BlogPageProps {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  // In development, always read fresh data to ensure hot reload works
  if (process.env.NODE_ENV === 'development') {
    try {
      // Try to read from static JSON first (faster)
      const { readFileSync } = await import('fs');
      const { join } = await import('path');
      const postPath = join(process.cwd(), 'src/data/posts', `${slug}.json`);
      const postData = JSON.parse(readFileSync(postPath, 'utf8'));
      return postData;
    } catch {
      // Fallback to file system generation
      return await generatePost(slug);
    }
  }
  
  // Production: use dynamic imports with caching
  try {
    const postData = await import(`@/data/posts/${slug}.json`).then(m => m.default);
    return postData;
  } catch {
    return null;
  }
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

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
      <BlogPostComponent post={post} />
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
