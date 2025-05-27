import { BlogCard } from "@/components/BlogCard";
import { Hero } from "@/components/Hero";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <Hero />

      {/* About Section */}
      <section id="about" className="bg-gray-50 px-8 sm:px-20 py-20 pb-32">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-center">
            {/* Profile Image */}
            <div className="lg:col-span-2 flex justify-center">
              <div className="w-64 h-80">
                <Image
                  src="/profile.png"
                  alt="Profile photo"
                  width={256}
                  height={320}
                  className="rounded-2xl shadow-lg object-cover w-full h-full"
                />
              </div>
            </div>

            {/* Text Content */}
            <div className="lg:col-span-3">
              <div className="text-center lg:text-left mb-8">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2 font-[family-name:var(--font-lato)]">
                  ABOUT ME
                </p>
                <h2 className="text-3xl sm:text-4xl font-normal text-gray-900 font-[family-name:var(--font-crimson)]">
                  Ivan Leo
                </h2>
              </div>
              <div className="space-y-5 text-base text-gray-700 font-[family-name:var(--font-lato)] leading-relaxed">
                <p>
                  Hailing from the sunny island of Singapore, I'm a Research
                  Engineer passionate about Language Models. I maintain open
                  source libraries like Instructor (3M+ downloads) and actively
                  contribute to projects like Kura.
                </p>
                <p>
                  I've had the privilege of working with clients like Hubspot
                  and Raycast, and recently worked on a RAG course taken by
                  engineers from OpenAI, Anthropic, DeepMind, and Bain.
                </p>
                <p>
                  I'm also a big fan of the outdoors, and love to go hiking,
                  biking, and swimming. When I'm not working, you can find me
                  exploring the great outdoors or Singapore's fantastic food
                  scene.
                </p>
              </div>
              
              {/* Work With Me Button */}
              <div className="mt-8 text-center lg:text-left">
                <Link
                  href="https://cal.com/ivanleo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block border border-gray-900 text-gray-900 px-6 py-2 font-[family-name:var(--font-lato)] text-sm tracking-wide hover:bg-gray-900 hover:text-white transition-all duration-200"
                >
                  Work With Me
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Cards Section */}
      <section id="blog" className="bg-gray-50 px-8 sm:px-20 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-8">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2 font-[family-name:var(--font-lato)]">
              RECENT THOUGHTS
            </p>
            <h2 className="text-4xl sm:text-5xl font-normal text-gray-900 font-[family-name:var(--font-crimson)]">
              Ideas worth sharing,
              <br />
              all in one place
            </h2>
          </div>

          {/* View All Articles Link */}
          <div className="text-center mb-12">
            <Link
              href="#"
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-[family-name:var(--font-lato)] text-sm tracking-wide"
            >
              View all articles →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <BlogCard
              imageUrl="/article_1.png"
              title="Write Stupid Evals"
              description="Start simple with evals and build up complexity gradually. The best evaluation isn't the most sophisticated one - it's the one you'll actually use consistently."
            />
            <BlogCard
              imageUrl="/article_2.png"
              title="Synthetic Data is not a Free Lunch"
              description="Hard-earned lessons from generating millions of synthetic data points and why validation matters more than volume. Success requires careful thought and systematic validation."
            />
            <BlogCard
              imageUrl="/article_3.png"
              title="You're probably not doing experiments right"
              description="Three key factors that make the biggest difference in LLM experiments: being clear about what you're varying, investing in infrastructure, and doing sensitivity analysis."
            />
          </div>
        </div>
      </section>

      {/* Bottom margin for scrolling */}
      <div className="h-32 bg-gray-50"></div>
    </div>
  );
}
