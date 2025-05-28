"use client";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <nav 
        className={`${
          isScrolled 
            ? "fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-sm shadow-lg py-3 px-6 rounded-full max-w-md" 
            : "relative py-6 px-8 sm:px-20 w-full"
        } z-50 flex justify-between items-center transition-all duration-300`}
      >
        <div className={`${
          isScrolled ? "text-lg text-white" : "text-2xl text-gray-900"
        } font-bold transition-all duration-300`}>
          IL
        </div>
        
        {/* Desktop Navigation - Normal State */}
        {!isScrolled && (
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
        )}

        {/* Shrunk State - Get in touch button + Hamburger */}
        {isScrolled && (
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="outline" className="bg-white text-gray-900 hover:bg-gray-100">
              <a href="/contact">Get in touch</a>
            </Button>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 hover:bg-gray-700 rounded-md transition-colors text-white"
              aria-label="Toggle menu"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        )}
      </nav>

      {/* Mobile Menu Dropdown */}
      {isScrolled && showMobileMenu && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-sm shadow-lg rounded-lg p-4 z-40 max-w-md mx-4">
          <div className="flex flex-col gap-3">
            <a
              href="#about"
              className="text-white hover:text-gray-300 cursor-pointer px-3 py-2 rounded-md hover:bg-gray-700 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("about")?.scrollIntoView({
                  behavior: "smooth",
                });
                setShowMobileMenu(false);
              }}
            >
              About
            </a>
            <a 
              href="/blog" 
              className="text-white hover:text-gray-300 px-3 py-2 rounded-md hover:bg-gray-700 transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              Blog
            </a>
            <a 
              href="#" 
              className="text-white hover:text-gray-300 px-3 py-2 rounded-md hover:bg-gray-700 transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              Projects
            </a>
          </div>
        </div>
      )}
    </>
  );
}
