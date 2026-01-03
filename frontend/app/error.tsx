"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <div className="mb-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Oops! Something went wrong
          </h1>
          <p className="text-gray-600 text-lg mb-6">
            We encountered an unexpected error. Don't worry, our team has been notified.
          </p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-mono text-red-800 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition font-medium"
          >
            Return Home
          </Link>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>
            Need help?{" "}
            <Link href="/contact" className="text-primary-600 hover:text-primary-700 underline">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
