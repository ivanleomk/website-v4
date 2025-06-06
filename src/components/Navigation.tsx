"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  const handleAboutClick = (e: React.MouseEvent) => {
    if (isHomePage) {
      e.preventDefault();
      document.getElementById("about")?.scrollIntoView({
        behavior: "smooth",
      });
    }
  };

  return (
    <nav className="relative z-10 flex justify-between items-center px-8 py-6 sm:px-20">
      <Link
        href="/"
        className="text-2xl font-bold text-gray-900 hover:text-gray-700"
      >
        IL
      </Link>
      <div className="flex gap-8 text-gray-700 font-[family-name:var(--font-lato)]">
        {isHomePage ? (
          <a
            href="#about"
            className="hover:text-gray-900 cursor-pointer"
            onClick={handleAboutClick}
          >
            About
          </a>
        ) : (
          <Link href="/#about" className="hover:text-gray-900">
            About
          </Link>
        )}
        <Link href="/blog" className="hover:text-gray-900">
          Blog
        </Link>
        <a href="#" className="hover:text-gray-900">
          Projects
        </a>
      </div>
    </nav>
  );
}
