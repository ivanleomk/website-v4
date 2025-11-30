"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Index" },
    { href: "/series", label: "Series" },
    { href: "/blog", label: "Articles" },
  ];

  return (
    <header className="border-b border-gray-200 sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-4xl mx-auto px-6 flex h-16 items-center justify-between">
        <Link
          href="/"
          className="text-xl font-serif font-medium tracking-tight hover:text-gray-600 transition-colors text-black"
        >
          Ivan Leo
        </Link>

        <nav className="flex items-center gap-6 text-sm font-sans font-medium text-gray-500">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "transition-colors hover:text-black",
                pathname === item.href &&
                  "text-black underline decoration-black decoration-2 underline-offset-4"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
