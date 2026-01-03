import { getAllPosts } from "@/lib/blog";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://ivanleo.com";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const posts = await getAllPosts();
  const publishedPosts = posts.filter((post) => !post.draft);

  const items = publishedPosts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((post) => {
      const link = `${baseUrl}/blog/${post.slug}`;
      const categories = post.categories
        .map((category) => `<category>${escapeXml(category)}</category>`)
        .join("");

      return `
        <item>
          <title>${escapeXml(post.title)}</title>
          <link>${link}</link>
          <guid>${link}</guid>
          <description>${escapeXml(post.description)}</description>
          <pubDate>${new Date(post.date).toUTCString()}</pubDate>
          ${categories}
        </item>
      `;
    })
    .join("");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>Ivan Leo - Blog</title>
        <link>${baseUrl}/blog</link>
        <description>Ivan rambles on about LLM reliability, evals and UX design</description>
        <language>en-us</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        ${items}
      </channel>
    </rss>
  `;

  return new Response(feed.trim(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
