import { getAllPosts } from "@/lib/blog";
import { Navigation } from "@/components/Navigation";
import { Posts } from "@/components/Posts";
import { CategoryLinks } from "@/components/CategoryLinks";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";

function Header() {
  return (
    <header className="mb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left side: Title + description */}
        <div>
          <h1 className="text-8xl font-bold text-black leading-none mb-6">
            Articles
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed max-w-sm">
            Short rants about language models, evaluations and ux design for the
            LLM age
          </p>
        </div>

        {/* Right side: Category links */}
        <div>
          <Suspense fallback={<div className="flex flex-wrap gap-3 items-start justify-start animate-pulse"><div className="h-8 w-16 bg-gray-200 rounded-full"></div></div>}>
            <CategoryLinks />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <div className="bg-white min-h-screen">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Header />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-20">
          <div className="space-y-12">
            <div>
              <h2 className="text-4xl font-bold mb-4 text-black">
                Writing Better Extraction Evals
              </h2>
              <p className="text-gray-600 mb-6 max-w-lg">
                Learn how to create more effective evaluation frameworks for
                your extraction pipelines. A deep dive into testing strategies
                that actually work.
              </p>
              <Link
                href="/blog/writing-extraction-evals"
                className="inline-block bg-yellow-300 text-black px-6 py-3 rounded font-medium hover:bg-yellow-400 transition-colors"
              >
                Read the guide
              </Link>
            </div>

            <div>
              <h2 className="text-4xl font-bold mb-4 text-black">
                Looking At Your Data
              </h2>
              <p className="text-gray-600 mb-6 max-w-lg">
                Data analysis techniques and best practices for understanding
                your datasets. From exploratory analysis to actionable insights.
              </p>
              <Link
                href="/blog/looking-at-your-data"
                className="inline-block border-2 border-black text-black px-6 py-3 rounded font-medium hover:bg-black hover:text-white transition-colors"
              >
                Explore the methods
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <Image
              src="/bonsai.png"
              alt="Technical illustration"
              width={400}
              height={400}
              className="w-full max-w-[400px] h-auto rounded-lg"
            />
          </div>
        </div>

        <div id="posts">
          <Suspense fallback={<div>Loading posts...</div>}>
            <Posts posts={posts} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
