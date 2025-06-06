import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parseMarkdown } from "@/lib/markdown";
import { BlogPostComponent } from "@/components/blog-post";
import { Navigation } from "@/components/Navigation";
import { notFound } from "next/navigation";
import Link from "next/link";

interface BlogPageProps {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  try {
    const postsDirectory = join(process.cwd(), "content", "blog");
    const fullPath = join(postsDirectory, `${slug}.md`);
    const fileContents = readFileSync(fullPath, "utf8");
    return await parseMarkdown(fileContents, slug);
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
      <div className="max-w-3xl mx-auto px-4 pt-8">
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

export async function generateStaticParams() {
  try {
    const postsDirectory = join(process.cwd(), "content", "blog");
    const filenames = readdirSync(postsDirectory);

    return filenames
      .filter((name: string) => name.endsWith(".md"))
      .map((name: string) => ({
        slug: name.replace(/\.md$/, ""),
      }));
  } catch {
    return [];
  }
}
