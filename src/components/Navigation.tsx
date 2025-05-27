"use client";
export function Navigation() {
  return (
    <nav className="relative z-10 flex justify-between items-center px-8 py-6 sm:px-20">
      <div className="text-2xl font-bold text-gray-900">IL</div>
      <div className="flex gap-8 text-gray-700 font-[family-name:var(--font-lato)]">
        <a
          href="#about"
          className="hover:text-gray-900 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("about")?.scrollIntoView({
              behavior: "smooth",
            });
          }}
        >
          About
        </a>
        <a href="/blog" className="hover:text-gray-900">
          Blog
        </a>
        <a href="#" className="hover:text-gray-900">
          Projects
        </a>
      </div>
    </nav>
  );
}
