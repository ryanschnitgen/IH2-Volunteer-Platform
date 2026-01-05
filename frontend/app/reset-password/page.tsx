"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      console.log('🚀 Initiating password reset for:', email);

      // Try client-side password reset first
      try {
        await resetPassword(email);
        console.log('✓ Client-side password reset completed');
        setSuccess(true);
        setEmail("");
      } catch (clientError: any) {
        console.warn('⚠️ Client-side password reset failed, trying server-side:', clientError);
        console.log('Client error details:', clientError.code, clientError.message);

        // Fallback to server-side password reset
        console.log('🔄 Calling server-side password reset API...');
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        console.log('📡 Server response status:', response.status);

        const data = await response.json();
        console.log('📦 Server response data:', data);

        if (!response.ok) {
          console.error('❌ Server-side reset failed:', data);
          throw new Error(data.error || 'Failed to send password reset email');
        }

        console.log('✓ Server-side password reset completed successfully');
        setSuccess(true);
        setEmail("");
      }
    } catch (err: any) {
      console.error("❌ Password reset error caught:", err);
      console.error("Error details:", {
        code: err.code,
        message: err.message,
        stack: err.stack
      });

      // Provide more user-friendly error messages
      let errorMessage = "Failed to send password reset email";

      if (err.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many reset attempts. Please try again later.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-4xl font-bold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-lg rounded-lg">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
              <p className="font-semibold">✓ Password reset email sent!</p>
              <p className="text-sm mt-2">
                Check your email inbox for a password reset link from Firebase. The email should arrive within a few minutes.
              </p>
              <p className="text-sm mt-1 font-medium">
                Don't see it? Check your spam/junk folder.
              </p>
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer font-semibold">Troubleshooting (click to expand)</summary>
                <div className="mt-2 space-y-1 bg-white p-2 rounded">
                  <p>• Wait 5-10 minutes for email to arrive</p>
                  <p>• Check ALL folders including Spam/Junk/Promotions</p>
                  <p>• Search inbox for "noreply@ih2-volunteer-portal-3f4d1.firebaseapp.com"</p>
                  <p>• Open browser console (F12) and check for error messages</p>
                  <p>• Try from a different browser or device</p>
                </div>
              </details>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:shadow-lg transform hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
