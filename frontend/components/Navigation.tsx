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

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-1">
          <Link href="/" className="flex items-center">
            <Image
              src="/smaller logo-Picsart-BackgroundRemover.jpg"
              alt="Inspired Hearts and Hands Logo"
              width={200}
              height={50}
              className="h-auto w-auto max-h-16"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`font-medium transition ${
                  pathname === item.href
                    ? "text-primary-600"
                    : "text-gray-600 hover:text-primary-600"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {!loading && (
              user ? (
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <Link
                      href="/profile"
                      className="text-sm text-gray-700 hover:text-primary-600 transition font-medium"
                    >
                      {user.displayName || user.email}
                    </Link>
                    {!waiverSigned && (
                      <Link
                        href="/waiver"
                        className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                        title="You must sign the waiver to register for events"
                      >
                        ⚠️ Sign Waiver Required
                      </Link>
                    )}
                  </div>
                  <button
                    onClick={logout}
                    className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="bg-gradient-to-r from-primary-600 to-primary-500 text-white px-6 py-2 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition"
                >
                  Sign In
                </Link>
              )
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block py-2 font-medium transition ${
                  pathname === item.href
                    ? "text-primary-600"
                    : "text-gray-600 hover:text-primary-600"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {!loading && (
              user ? (
                <div className="mt-4 space-y-2">
                  <Link
                    href="/profile"
                    className="block text-sm text-gray-700 hover:text-primary-600 transition font-medium px-2 py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {user.displayName || user.email}
                  </Link>
                  {!waiverSigned && (
                    <Link
                      href="/waiver"
                      className="block text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      ⚠️ Sign Waiver Required
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="w-full bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="w-full mt-4 block text-center bg-gradient-to-r from-primary-600 to-primary-500 text-white px-6 py-2 rounded-lg hover:shadow-lg transition"
                >
                  Sign In
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
