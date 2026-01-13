"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isAdmin } from "@backend/lib/admin";

export default function AdminCleanup() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin(user.email))) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const cleanupOrphanedHours = async () => {
    if (!user) return;

    setCleaning(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/admin/cleanup-orphaned-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: user.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cleanup");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to cleanup orphaned hours");
    } finally {
      setCleaning(false);
    }
  };

  const cleanupOrphanedRegistrations = async () => {
    if (!user) return;

    setCleaning(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/admin/cleanup-orphaned-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: user.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cleanup");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to cleanup orphaned registrations");
    } finally {
      setCleaning(false);
    }
  };

  const cleanupAll = async () => {
    if (!user) return;

    setCleaning(true);
    setError("");
    setResult(null);

    try {
      // Run both cleanups
      const [hoursRes, regsRes] = await Promise.all([
        fetch("/api/admin/cleanup-orphaned-hours", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userEmail: user.email }),
        }),
        fetch("/api/admin/cleanup-orphaned-registrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userEmail: user.email }),
        }),
      ]);

      const hoursData = await hoursRes.json();
      const regsData = await regsRes.json();

      if (!hoursRes.ok || !regsRes.ok) {
        throw new Error("Failed to cleanup some data");
      }

      setResult({
        message: "Cleanup completed",
        hours: hoursData,
        registrations: regsData,
      });
    } catch (err: any) {
      setError(err.message || "Failed to cleanup");
    } finally {
      setCleaning(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user || !isAdmin(user.email)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Database Cleanup Tools
        </h1>
        <p className="text-gray-600 mb-8">
          Remove orphaned data from deleted events
        </p>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            <h3 className="font-bold mb-2">✓ Cleanup Successful</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            What does this do?
          </h2>
          <div className="space-y-4 text-gray-700">
            <p>
              When you delete events from the admin panel, the event itself is removed,
              but associated data (HoursLog entries and EventRegistrations) may remain in
              the database. This can cause incorrect hour calculations.
            </p>
            <p className="font-semibold">This tool will:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Find all HoursLog entries linked to deleted events</li>
              <li>Find all EventRegistrations linked to deleted events</li>
              <li>Delete these orphaned records</li>
              <li>Show you a report of what was cleaned up</li>
            </ul>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
              <p className="font-semibold text-yellow-800">⚠️ Warning</p>
              <p className="text-yellow-700 text-sm">
                This action cannot be undone. Only run this if you're sure you want to
                remove data from deleted events.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Cleanup Actions
          </h2>

          <div className="space-y-4">
            <button
              onClick={cleanupAll}
              disabled={cleaning}
              className="w-full px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cleaning ? "Cleaning..." : "🧹 Clean Up All Orphaned Data (Recommended)"}
            </button>

            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={cleanupOrphanedHours}
                disabled={cleaning}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cleaning ? "Cleaning..." : "Clean Up Hours Logs Only"}
              </button>

              <button
                onClick={cleanupOrphanedRegistrations}
                disabled={cleaning}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cleaning ? "Cleaning..." : "Clean Up Registrations Only"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
