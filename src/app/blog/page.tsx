import { getAllPosts } from "@/lib/blog";
import { Navigation } from "@/components/Navigation";
import { Posts } from "@/components/Posts";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";

const categories = [
  "LLM",
  "RAG",
  "Prompting",
  "UX Design",
  "Verification",
  "Agents",
  "Reflections",
];

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
          <div className="flex flex-wrap gap-3 items-start justify-start">
            {categories.map((category) => (
              <div
                key={category}
                className="sketchy-wrapper relative inline-block group"
              >
                <Link
                  href={`#${category.toLowerCase()}`}
                  className="inline-block px-4 py-2 text-gray-700 hover:text-gray-900 text-lg font-medium"
                >
                  {category}
                </Link>

                {/* 
                  SVG “hand-sketch” ellipse, rotated by 30°. 
                  - Using viewBox 0 0 100 100 with r=45 leaves a 5-unit margin inside.
                  - When stretched (preserveAspectRatio="none"), this circle → ellipse that fills the link’s box.
                  - transform="rotate(30 50 50)" spins it 30° around the center point (50,50).
                */}
                <svg
                  className="sketchy-circle absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  focusable="false"
                >
                  <defs>
                    <filter id="roughStroke">
                      <feTurbulence
                        type="turbulence"
                        baseFrequency="0.03"
                        numOctaves="2"
                        result="turb"
                      />
                      <feDisplacementMap
                        in="SourceGraphic"
                        in2="turb"
                        scale="2"
                        xChannelSelector="R"
                        yChannelSelector="G"
                      />
                    </filter>
                  </defs>

                  {/* 
                    Circle of radius 45, rotated 30° around (50,50).
                    New circumference = 2·π·45 ≈ 282.74 
                  */}
                  <circle
                    className="circle-path"
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#4B5563"
                    strokeWidth="3"
                    strokeLinecap="round"
                    filter="url(#roughStroke)"
                    transform="rotate(30 50 50)"
                  />
                </svg>
              </div>
            ))}
          </div>
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
