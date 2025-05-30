import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parseMarkdown } from "@/lib/markdown";
import { BlogPostComponent } from "@/components/blog-post";
import { Navigation } from "@/components/Navigation";
import { notFound } from "next/navigation";

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
    <div>
      <Navigation />
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
