import { ImageResponse } from "next/og";

export const alt = "Blog Post";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

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
      return null;
    }
  }
  
  // Production: use dynamic imports with caching
  try {
    const postData = await import(`@/data/posts/${slug}.json`).then(
      (m) => m.default
    );
    return postData;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);

  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            background: "linear-gradient(135deg, #000 0%, #333 100%)",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "60px",
            fontWeight: "bold",
            color: "white",
          }}
        >
          Post Not Found
        </div>
      ),
      {
        ...size,
      }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "30px",
            flex: 1,
            width: "100%",
          }}
        >
          <h1
            style={{
              fontSize: "64px",
              fontWeight: "bold",
              color: "#000",
              lineHeight: "1.1",
              margin: 0,
              textAlign: "left",
            }}
          >
            {post.title}
          </h1>
          <p
            style={{
              fontSize: "32px",
              color: "#666",
              lineHeight: "1.4",
              margin: 0,
              textAlign: "left",
            }}
          >
            {post.description}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            marginTop: "40px",
          }}
        >
          <div
            style={{
              fontSize: "24px",
              color: "#000",
              fontWeight: "600",
            }}
          >
            Ivan Leo
          </div>
          <div
            style={{
              fontSize: "20px",
              color: "#666",
            }}
          >
            {new Date(post.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
