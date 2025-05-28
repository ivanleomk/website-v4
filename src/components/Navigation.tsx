"use client";
import { useEffect, useState } from "react";

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav 
      className={`${
        isScrolled 
          ? "fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-sm" 
          : "relative"
      } z-50 flex justify-between items-center px-8 py-6 sm:px-20 transition-all duration-300`}
    >
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
