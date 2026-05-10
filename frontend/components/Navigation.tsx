"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@backend/lib/admin";

export default function Navigation() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, loading, waiverSigned } = useAuth();

  const baseNavItems = [
    { href: "/", label: "Home" },
    { href: "/opportunities", label: "Opportunities" },
    { href: "/my-schedule", label: "My Schedule" },
    { href: "/volunteer-hours", label: "My Reporting" },
    { href: "/contact", label: "Contact" },
  ];

  const navItems = user && isAdmin(user.email)
    ? [...baseNavItems, { href: "/admin", label: "Admin" }]
    : baseNavItems;

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() ?? '?';

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/smaller logo-Picsart-BackgroundRemover.jpg"
              alt="Inspired Hearts and Hands Logo"
              width={200}
              height={50}
              className="h-auto w-auto max-h-14"
              priority
            />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "text-primary-600 bg-primary-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop right area */}
          <div className="hidden md:flex items-center gap-2">
            {!loading && (
              user ? (
                <>
                  {!waiverSigned && (
                    <Link
                      href="/waiver"
                      className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full font-semibold hover:bg-amber-100 transition-colors"
                    >
                      Sign Waiver
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <span className="text-sm text-gray-700 font-medium max-w-[8rem] truncate">
                      {user.displayName || user.email}
                    </span>
                  </Link>
                  <button
                    onClick={logout}
                    className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Sign In
                </Link>
              )
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile dropdown */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 pt-3 border-t border-gray-100">
            <div className="space-y-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "text-primary-600 bg-primary-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {!loading && (
              user ? (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-0.5">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{user.displayName || user.email}</span>
                  </Link>
                  {!waiverSigned && (
                    <Link
                      href="/waiver"
                      className="block px-3 py-2.5 text-sm text-amber-700 font-semibold rounded-lg hover:bg-amber-50 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign Waiver Required
                    </Link>
                  )}
                  <button
                    onClick={() => { setIsMenuOpen(false); logout(); }}
                    className="w-full text-left px-3 py-2.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Link
                    href="/login"
                    className="block text-center bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
