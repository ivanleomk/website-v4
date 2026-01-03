import { getAllPosts } from "@/lib/blog";
import { NextResponse } from "next/server";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://ivanleo.com";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = await getAllPosts();
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const lastBuildDate =
    sortedPosts[0]?.date ?? new Date().toISOString();

  const items = sortedPosts
    .map((post) => {
      const link = `${baseUrl}/blog/${post.slug}`;
      const categories = post.categories
        .map((category) => `<category>${escapeXml(category)}</category>`)
        .join("");

      return `
        <item>
          <title>${escapeXml(post.title)}</title>
          <link>${link}</link>
          <guid isPermaLink="true">${link}</guid>
          <description>${escapeXml(post.description)}</description>
          <pubDate>${new Date(post.date).toUTCString()}</pubDate>
          ${categories}
        </item>
      `;
    })
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>Ivan Leo - Blog</title>
        <link>${baseUrl}/blog</link>
        <description>Ivan rambles on about LLM reliability, evals and UX design</description>
        <language>en-us</language>
        <lastBuildDate>${new Date(lastBuildDate).toUTCString()}</lastBuildDate>
        <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
        ${items}
      </channel>
    </rss>`;

  return new NextResponse(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}

