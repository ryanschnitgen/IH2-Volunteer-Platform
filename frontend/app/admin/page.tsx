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
      const adminEmail = encodeURIComponent(user?.email || '');
      const [usersRes, eventsRes, allRegistrationsRes, allHoursRes] = await Promise.all([
        fetch(`/api/admin/users?adminEmail=${adminEmail}&t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/events?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/events/registrations/all?userId=${user?.uid || ''}&adminEmail=${adminEmail}&t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/hours/all?userId=${user?.uid || ''}&adminEmail=${adminEmail}&t=${timestamp}`, { cache: 'no-store' }),
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
        return eventDate >= now && event.status === "active";
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

      // Add manual and clock-in/out hours (not auto-assigned from events, not pending)
      const manualHours = (allHoursData.hoursLogs || [])
        .filter((log: any) => {
          const logDate = new Date(log.date);
          return logDate.getFullYear() === currentYear && !log.autoAssigned && !log.pendingApproval;
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
      <div className="page-hero">
        <div className="relative z-10 container mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your volunteer portal</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Total Users</p>
            <p className="text-4xl font-bold text-primary-600 tabular-nums">
              {loadingStats ? <span className="text-gray-200 animate-pulse">—</span> : stats.totalUsers}
            </p>
            <p className="text-sm text-gray-500 mt-1">users with accounts</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Active Events</p>
            <p className="text-4xl font-bold text-blue-600 tabular-nums">
              {loadingStats ? <span className="text-gray-200 animate-pulse">—</span> : stats.activeEvents}
            </p>
            <p className="text-sm text-gray-500 mt-1">upcoming or ongoing</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{new Date().getFullYear()} Hours</p>
            <p className="text-4xl font-bold text-green-600 tabular-nums">
              {loadingStats ? <span className="text-gray-200 animate-pulse">—</span> : stats.currentYearHours.toFixed(1)}
            </p>
            <p className="text-sm text-gray-500 mt-1">all volunteers combined</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/admin/volunteers" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-gray-200 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1">User Management</h2>
            <p className="text-sm text-gray-500">View all volunteers, manage accounts, and assign admin privileges.</p>
          </Link>

          <Link href="/admin/email" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-gray-200 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-4 group-hover:bg-green-100 transition-colors">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Email Communications</h2>
            <p className="text-sm text-gray-500">Send emails to all volunteers or specific event participants.</p>
          </Link>

          <Link href="/admin/events" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-gray-200 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Event Management</h2>
            <p className="text-sm text-gray-500">Create and manage events, view registrations and QR check-ins.</p>
          </Link>

          <Link href="/admin/log-hours" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-gray-200 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-4 group-hover:bg-orange-100 transition-colors">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Hours Tracking</h2>
            <p className="text-sm text-gray-500">Clock in/out for live tracking or manually log volunteer hours.</p>
          </Link>

          <Link href="/admin/import-volunteers" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-gray-200 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center mb-4 group-hover:bg-cyan-100 transition-colors">
              <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Import Volunteers</h2>
            <p className="text-sm text-gray-500">Upload CSV to add usernames or create new volunteer profiles.</p>
          </Link>

          <Link href="/admin/import-hours" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-gray-200 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-4 group-hover:bg-teal-100 transition-colors">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Import Hours</h2>
            <p className="text-sm text-gray-500">Upload Excel with historical volunteer hours from legacy system.</p>
          </Link>

          <Link href="/admin/analytics" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-gray-200 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Volunteer Analytics</h2>
            <p className="text-sm text-gray-500">Comprehensive reports, unique volunteer tracking, and data export.</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
