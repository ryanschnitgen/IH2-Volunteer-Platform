import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found | IH2 Volunteer Portal",
  description: "The page you're looking for doesn't exist.",
};

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <div className="mb-8">
          <div className="text-8xl font-bold text-primary-600 mb-4">404</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Page Not Found
          </h1>
          <p className="text-gray-600 text-lg mb-6">
            Sorry, we couldn't find the page you're looking for. It may have been moved or deleted.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link
            href="/"
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
          >
            Return Home
          </Link>
          <Link
            href="/opportunities"
            className="px-6 py-3 border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition font-medium"
          >
            Browse Opportunities
          </Link>
        </div>

        <div className="text-sm text-gray-500">
          <p className="mb-4">Looking for something specific?</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/volunteer-hours" className="text-primary-600 hover:text-primary-700 underline">
              My Hours
            </Link>
            <span className="text-gray-400">•</span>
            <Link href="/my-schedule" className="text-primary-600 hover:text-primary-700 underline">
              My Schedule
            </Link>
            <span className="text-gray-400">•</span>
            <Link href="/contact" className="text-primary-600 hover:text-primary-700 underline">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
