"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";

const navLinks = [
  { name: "Play", href: "/", external: false },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#07955F]">
            <span className="text-xs font-bold text-white">RF</span>
          </div>
          <span className="font-display text-lg font-bold tracking-tight">
            RangeFrenzy
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary text-foreground/70"
              >
                {link.name}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === link.href ? "text-foreground" : "text-foreground/70"
                }`}
              >
                {link.name}
              </Link>
            )
          )}
        </nav>

       
        <div className="flex items-center gap-3" />
      </div>
    </header>
  );
}
