"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAdmin } from "@backend/lib/admin";
import Link from "next/link";

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeEvents: 0,
    currentYearHours: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !isAdmin(user.email))) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && isAdmin(user.email)) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      setLoadingStats(true);

      // Fetch users, events, registrations, and hours logs in parallel with cache busting
      const timestamp = Date.now();
      const [usersRes, eventsRes, allRegistrationsRes, allHoursRes] = await Promise.all([
        fetch(`/api/admin/users?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/events?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/events/registrations/all?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/hours/all?t=${timestamp}`, { cache: 'no-store' }),
      ]);

      const usersData = await usersRes.json();
      const eventsData = await eventsRes.json();
      const allRegistrationsData = await allRegistrationsRes.json();
      const allHoursData = await allHoursRes.json();

      // Count active events (upcoming or ongoing)
      const now = new Date();
      const currentYear = now.getFullYear();

      const activeEvents = eventsData.events?.filter((event: any) => {
        const eventDate = new Date(event.date);
        return eventDate >= now || event.status === "active";
      }).length || 0;

      // Calculate current year volunteer hours from:
      // 1. Event-based hours (only count for people who checked in - no group multiplication)
      // 2. Manual and clock-in/out hours (from hours logs)

      const eventHours = (allRegistrationsData.registrations || [])
        .filter((reg: any) => {
          const eventDate = new Date(reg.eventDate);
          // Only count hours for people who actually checked in or were marked as attended
          return eventDate.getFullYear() === currentYear &&
                 reg.hoursCompleted > 0 &&
                 (reg.checkedIn || reg.attended) &&
                 reg.cancelled !== true; // Exclude cancelled registrations
        })
        .reduce((sum: number, reg: any) => {
          // Count hours for only the person who checked in (not the whole group)
          return sum + reg.hoursCompleted;
        }, 0);

      // Add manual and clock-in/out hours (not auto-assigned from events)
      const manualHours = (allHoursData.hoursLogs || [])
        .filter((log: any) => {
          const logDate = new Date(log.date);
          return logDate.getFullYear() === currentYear && !log.autoAssigned;
        })
        .reduce((sum: number, log: any) => sum + log.hours, 0);

      const currentYearHours = eventHours + manualHours;

      setStats({
        totalUsers: usersData.users?.length || 0,
        activeEvents,
        currentYearHours: Math.round(currentYearHours * 100) / 100, // 2 decimal precision
      });
    } catch (err) {
      console.error("Error loading stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading) {
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
    <div className="min-h-screen bg-gray-50">
      <div
        className="text-white py-12 relative overflow-hidden bg-white"
        style={{
          backgroundImage: `url('/handprint.png')`,
          backgroundPosition: 'center',
          backgroundSize: 'auto 100%',
          backgroundRepeat: 'repeat-x'
        }}
      >
        <div className="container mx-auto px-4 relative z-10">
          <h1 className="text-6xl font-bold mb-4 text-gray-900" style={{ textShadow: '3px 3px 6px rgba(255,255,255,0.9), -2px -2px 4px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.8)' }}>
            Admin Dashboard
          </h1>
          <p className="text-2xl font-semibold text-gray-800" style={{ textShadow: '2px 2px 4px rgba(255,255,255,0.9), -1px -1px 2px rgba(255,255,255,0.9)' }}>
            Manage your volunteer portal
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* User Management Card */}
          <Link href="/admin/volunteers">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 rounded-lg p-3 mr-4">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">User Management</h2>
              </div>
              <p className="text-gray-600">
                View all volunteers, manage user accounts, and assign admin privileges.
              </p>
            </div>
          </Link>

          {/* Email Management Card */}
          <Link href="/admin/email">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 rounded-lg p-3 mr-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Email Communications</h2>
              </div>
              <p className="text-gray-600">
                Send emails to all volunteers or specific event participants with customizable templates.
              </p>
            </div>
          </Link>

          {/* Event Management Card */}
          <Link href="/admin/events">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="flex items-center mb-4">
                <div className="bg-purple-100 rounded-lg p-3 mr-4">
                  <svg
                    className="w-8 h-8 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Event Management</h2>
              </div>
              <p className="text-gray-600">
                Create, edit, and manage volunteer events. View all registrations and QR code check-ins in one place.
              </p>
            </div>
          </Link>

          {/* Log Hours Card */}
          <Link href="/admin/log-hours">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="flex items-center mb-4">
                <div className="bg-orange-100 rounded-lg p-3 mr-4">
                  <svg
                    className="w-8 h-8 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Hours Tracking</h2>
              </div>
              <p className="text-gray-600">
                Clock in/out for live tracking or manually log volunteer hours.
              </p>
            </div>
          </Link>

          {/* Volunteer Analytics Card */}
          <Link href="/admin/analytics">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="flex items-center mb-4">
                <div className="bg-indigo-100 rounded-lg p-3 mr-4">
                  <svg
                    className="w-8 h-8 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Volunteer Analytics</h2>
              </div>
              <p className="text-gray-600">
                View comprehensive volunteer reports, track unique volunteers, and export data.
              </p>
            </div>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Overview</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-primary-600">
                {loadingStats ? "..." : stats.totalUsers}
              </p>
              <p className="text-gray-600 mt-2">Total Users</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-primary-600">
                {loadingStats ? "..." : stats.activeEvents}
              </p>
              <p className="text-gray-600 mt-2">Active Events</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-primary-600">
                {loadingStats ? "..." : stats.currentYearHours.toFixed(2)}
              </p>
              <p className="text-gray-600 mt-2">{new Date().getFullYear()} Volunteer Hours</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
