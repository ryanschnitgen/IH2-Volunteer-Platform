"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setShowBanner(false);
  };

  const declineCookies = () => {
    localStorage.setItem("cookieConsent", "declined");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white shadow-2xl border-t-4 border-primary-500">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">We Value Your Privacy</h3>
            <p className="text-gray-300 text-sm">
              We use cookies to enhance your experience, maintain your session, and analyze site usage.
              By clicking "Accept", you consent to our use of cookies.{" "}
              <Link href="/privacy-policy" className="text-primary-400 hover:text-primary-300 underline">
                Learn more
              </Link>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={declineCookies}
              className="px-6 py-2 border border-gray-500 text-gray-300 rounded-lg hover:bg-gray-800 transition font-medium"
            >
              Decline
            </button>
            <button
              onClick={acceptCookies}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
            >
              Accept Cookies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
