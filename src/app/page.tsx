import { BlogCard } from "@/components/BlogCard";
import { Hero } from "@/components/Hero";

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <Hero />

      {/* Blog Cards Section */}
      <section className="bg-gray-50 px-8 sm:px-20 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2 font-[family-name:var(--font-lato)]">
              RECENT THOUGHTS
            </p>
            <h2 className="text-4xl sm:text-5xl font-normal text-gray-900 font-[family-name:var(--font-crimson)]">
              Ideas worth sharing,
              <br />
              all in one place
            </h2>
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
