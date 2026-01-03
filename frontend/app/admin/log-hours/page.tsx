"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAdmin } from "@backend/lib/admin";

interface HoursLog {
  _id: string;
  userId: string;
  userEmail: string;
  userName: string;
  hours: number;
  date: string;
  autoAssigned: boolean;
  notes?: string;
  createdAt: string;
}

export default function LogHoursPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [hours, setHours] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hoursLogs, setHoursLogs] = useState<HoursLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Clock in/out state
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [activeClockIn, setActiveClockIn] = useState<any>(null);
  const [clockInActivity, setClockInActivity] = useState("");
  const [clockInNotes, setClockInNotes] = useState("");
  const [clockOutNotes, setClockOutNotes] = useState("");
  const [elapsedTime, setElapsedTime] = useState("");
  const [clockLoading, setClockLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin(user.email))) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && isAdmin(user.email)) {
      loadHoursLogs();
      loadClockStatus();
    }
  }, [user]);

  // Update elapsed time every minute when clocked in
  useEffect(() => {
    if (isClockedIn && activeClockIn) {
      const interval = setInterval(() => {
        const clockInTime = new Date(activeClockIn.clockInTime);
        const now = new Date();
        const diff = now.getTime() - clockInTime.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setElapsedTime(`${hours}h ${minutes}m`);
      }, 60000); // Update every minute

      // Calculate initial elapsed time
      const clockInTime = new Date(activeClockIn.clockInTime);
      const now = new Date();
      const diff = now.getTime() - clockInTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setElapsedTime(`${hours}h ${minutes}m`);

      return () => clearInterval(interval);
    }
  }, [isClockedIn, activeClockIn]);

  const loadHoursLogs = async () => {
    if (!user) return;

    try {
      setLoadingLogs(true);
      const response = await fetch(`/api/hours?userId=${user.uid}`);
      const data = await response.json();

      if (response.ok) {
        setHoursLogs(data.hoursLogs || []);
      }
    } catch (err) {
      console.error("Error loading hours logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadClockStatus = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/clock-in-out?userId=${user.uid}`);
      const data = await response.json();

      if (response.ok) {
        setIsClockedIn(data.isClockedIn);
        setActiveClockIn(data.activeClockIn);
      }
    } catch (err) {
      console.error("Error loading clock status:", err);
    }
  };

  const handleClockIn = async () => {
    if (!user || !clockInActivity.trim()) {
      setError("Please enter an activity description");
      return;
    }

    try {
      setClockLoading(true);
      setError("");

      const response = await fetch("/api/clock-in-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || user.email,
          activity: clockInActivity,
          notes: clockInNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to clock in");
      }

      setSuccess("Clocked in successfully!");
      setIsClockedIn(true);
      setActiveClockIn(data.clockIn);
      setClockInActivity("");
      setClockInNotes("");
    } catch (err: any) {
      setError(err.message || "Failed to clock in");
    } finally {
      setClockLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!user) return;

    try {
      setClockLoading(true);
      setError("");

      const response = await fetch("/api/clock-in-out", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          notes: clockOutNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to clock out");
      }

      setSuccess(`Clocked out successfully! Total time: ${data.hours} hours`);
      setIsClockedIn(false);
      setActiveClockIn(null);
      setClockOutNotes("");
      loadHoursLogs(); // Reload hours logs to show the new entry
    } catch (err: any) {
      setError(err.message || "Failed to clock out");
    } finally {
      setClockLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user) return;

    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      setError("Please enter a valid number of hours greater than 0");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || user.email,
          hours: hoursNum,
          date,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to log hours");
      }

      setSuccess(`Successfully logged ${hoursNum} hours!`);
      setHours("");
      setDate(new Date().toISOString().split('T')[0]);
      setNotes("");

      // Reload hours logs
      await loadHoursLogs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const totalManualHours = hoursLogs
    .filter(log => !log.autoAssigned)
    .reduce((sum, log) => sum + log.hours, 0);

  if (authLoading || loadingLogs) {
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Hours Tracking
          </h1>
          <p className="text-gray-600">
            Clock in/out for live tracking or manually log volunteer hours
          </p>
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-2 opacity-90">
            Total Manual Hours Logged
          </h3>
          <p className="text-5xl font-bold">{totalManualHours.toFixed(2)}</p>
        </div>

        {/* Clock In/Out Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Clock In/Out</h2>
          <p className="text-gray-600 mb-4">
            Track your time for non-event volunteer work like sorting donations, office tasks, etc.
          </p>

          {error && !(success) && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          {!isClockedIn ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={clockInActivity}
                  onChange={(e) => setClockInActivity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Sorting donations, Office work, Event setup"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={clockInNotes}
                  onChange={(e) => setClockInNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Any additional details about this work session"
                  rows={2}
                />
              </div>

              <button
                onClick={handleClockIn}
                disabled={clockLoading || !clockInActivity.trim()}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
              >
                {clockLoading ? "Clocking In..." : "🕐 Clock In"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-semibold text-green-800">Currently Clocked In</span>
                  </div>
                  <span className="text-2xl font-bold text-green-700">{elapsedTime}</span>
                </div>
                <p className="text-sm text-gray-700">
                  <strong>Activity:</strong> {activeClockIn?.activity}
                </p>
                {activeClockIn?.notes && (
                  <p className="text-sm text-gray-700 mt-1">
                    <strong>Notes:</strong> {activeClockIn.notes}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Started: {activeClockIn && new Date(activeClockIn.clockInTime).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clock Out Notes (Optional)
                </label>
                <textarea
                  value={clockOutNotes}
                  onChange={(e) => setClockOutNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Add any final notes about this work session"
                  rows={2}
                />
              </div>

              <button
                onClick={handleClockOut}
                disabled={clockLoading}
                className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
              >
                {clockLoading ? "Clocking Out..." : "🕐 Clock Out"}
              </button>
            </div>
          )}
        </div>

        {/* Log Hours Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Log New Hours</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hours <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter hours (e.g., 2.5, 0.2 for 12 min)"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes / Activity Description
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Describe the volunteer activity (e.g., 'Delivered meals to seniors')"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? "Logging Hours..." : "Log Hours"}
            </button>
          </form>
        </div>

        {/* Hours History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Your Hours History
          </h2>

          {hoursLogs.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No hours logged yet. Use the form above to log your first entry.
            </p>
          ) : (
            <div className="space-y-3">
              {hoursLogs.map((log) => (
                <div
                  key={log._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-2xl font-bold text-primary-600">
                          {log.hours.toFixed(2)}
                        </span>
                        <span className="text-gray-600">
                          {log.hours === 1 ? "hour" : "hours"}
                        </span>
                        {!log.autoAssigned && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
                            Manual
                          </span>
                        )}
                        {log.autoAssigned && (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                            Event
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <span>📅</span>
                          <span>{formatDate(log.date)}</span>
                        </span>
                      </div>
                      {log.notes && (
                        <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                          {log.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
