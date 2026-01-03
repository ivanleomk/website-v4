import {
  generatePost,
  generateStaticSlugs,
  generateAllPosts,
} from "@/lib/posts";
import { BlogPostComponent } from "@/components/blog-post";
import { Navigation } from "@/components/Navigation";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getSeriesDefinitions, getSeriesInfo } from "@/lib/series";

interface BlogPageProps {
  params: Promise<{ slug: string }>;
}

const isProduction = process.env.NODE_ENV === "production";

async function loadStaticPost(slug: string) {
  return import(`@/data/posts/${slug}.json`)
    .then((m) => m.default)
    .catch(() => null);
}

async function loadStaticPosts() {
  return import(`@/data/posts.json`)
    .then((m) => m.default)
    .catch(() => []);
}

async function getPost(slug: string) {
  if (!isProduction) {
    return generatePost(slug);
  }

  return loadStaticPost(slug);
}

async function getAllPosts() {
  if (!isProduction) {
    return generateAllPosts();
  }

  return loadStaticPosts();
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { slug } = await params;
  const [post, allPosts, seriesDefinitions] = await Promise.all([
    getPost(slug),
    getAllPosts(),
    getSeriesDefinitions(),
  ]);

  if (!post) {
    notFound();
  }

  const seriesInfo = getSeriesInfo(allPosts, slug, seriesDefinitions);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <BlogPostComponent post={post} seriesInfo={seriesInfo} />

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-sans text-gray-500">
          <p>© {new Date().getFullYear()} Ivan Leo. All rights reserved.</p>
          <div className="flex gap-6">
            <a
              href="https://twitter.com/ivanleomk"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black transition-colors"
            >
              Twitter
            </a>
            <a
              href="https://github.com/ivanleomk"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export async function generateMetadata({
  params,
}: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: "Post Not Found",
      description: "The requested blog post could not be found.",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://ivanleo.com";

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: post.authors,
      url: `${baseUrl}/blog/${slug}`,
      siteName: "Ivan Leo",
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
      card: "summary_large_image",
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
