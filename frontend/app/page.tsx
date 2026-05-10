"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [yearlyHours, setYearlyHours] = useState(0);
  const [monthlyHours, setMonthlyHours] = useState(0);
  const [communityHours, setCommunityHours] = useState(0);
  const [loadingHours, setLoadingHours] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadYearlyHours();
      loadCommunityHours();
    }
  }, [user]);

  const loadCommunityHours = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const [hoursRes, registrationsRes] = await Promise.all([
        fetch('/api/hours/all'),
        fetch('/api/events/registrations/all')
      ]);
      const hoursData = await hoursRes.json();
      const registrationsData = await registrationsRes.json();

      if (hoursRes.ok && registrationsRes.ok) {
        const eventHours = (registrationsData.registrations || [])
          .filter((reg: any) => {
            const d = new Date(reg.eventDate);
            return d.getFullYear() === currentYear && reg.hoursCompleted > 0 && (reg.checkedIn || reg.attended) && reg.cancelled !== true;
          })
          .reduce((sum: number, reg: any) => sum + reg.hoursCompleted, 0);

        const manualHours = (hoursData.hoursLogs || [])
          .filter((log: any) => new Date(log.date).getFullYear() === currentYear && !log.autoAssigned)
          .reduce((sum: number, log: any) => sum + (log.hours || 0), 0);

        setCommunityHours(eventHours + manualHours);
      }
    } catch (err) {
      console.error("Error loading community hours:", err);
    }
  };

  const loadYearlyHours = async () => {
    if (!user) return;
    try {
      setLoadingHours(true);
      const [registrationsRes, hoursLogsRes] = await Promise.all([
        fetch(`/api/events/registrations?userId=${user.uid}`),
        fetch(`/api/hours?userId=${user.uid}`)
      ]);
      const registrationsData = await registrationsRes.json();
      const hoursLogsData = await hoursLogsRes.json();

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();

      const eventHours = (registrationsData.registrations || [])
        .filter((reg: any) => new Date(reg.eventDate).getFullYear() === currentYear && (reg.attended || reg.checkedIn))
        .reduce((sum: number, reg: any) => sum + (reg.hoursCompleted || 0), 0);

      const manualHours = (hoursLogsData.hoursLogs || [])
        .filter((log: any) => new Date(log.date).getFullYear() === currentYear && !log.autoAssigned)
        .reduce((sum: number, log: any) => sum + (log.hours || 0), 0);

      const monthEventHours = (registrationsData.registrations || [])
        .filter((reg: any) => {
          const d = new Date(reg.eventDate);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth && (reg.attended || reg.checkedIn);
        })
        .reduce((sum: number, reg: any) => sum + (reg.hoursCompleted || 0), 0);

      const monthManualHours = (hoursLogsData.hoursLogs || [])
        .filter((log: any) => {
          const d = new Date(log.date);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth && !log.autoAssigned;
        })
        .reduce((sum: number, log: any) => sum + (log.hours || 0), 0);

      setYearlyHours(eventHours + manualHours);
      setMonthlyHours(monthEventHours + monthManualHours);
    } catch (err) {
      console.error("Error loading yearly hours:", err);
    } finally {
      setLoadingHours(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const initials = user.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.[0].toUpperCase() ?? '?';

  const firstName = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Volunteer';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="page-hero">
        <div className="relative z-10 container mx-auto px-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-sm">
              {initials}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back, {firstName}</h1>
              <p className="text-gray-500 text-sm mt-0.5">{user.email}</p>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">This Month</p>
            <p className="text-4xl font-bold text-blue-600 tabular-nums">
              {loadingHours ? <span className="text-gray-200 animate-pulse">—</span> : monthlyHours.toFixed(1)}
            </p>
            <p className="text-sm text-gray-500 mt-1">hours volunteered</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{new Date().getFullYear()} Total</p>
            <p className="text-4xl font-bold text-primary-600 tabular-nums">
              {loadingHours ? <span className="text-gray-200 animate-pulse">—</span> : yearlyHours.toFixed(1)}
            </p>
            <p className="text-sm text-gray-500 mt-1">your hours this year</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Community {new Date().getFullYear()}</p>
            <p className="text-4xl font-bold text-green-600 tabular-nums">
              {loadingHours ? <span className="text-gray-200 animate-pulse">—</span> : communityHours.toFixed(1)}
            </p>
            <p className="text-sm text-gray-500 mt-1">all volunteers combined</p>
          </div>
        </div>

        {/* Welcome + Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Welcome to Inspired Hearts and Hands</h2>
            <div className="text-gray-600 text-sm leading-relaxed space-y-4">
              <p>
                Thank you for your dedication to IH2. Your volunteer portal gives you real-time access
                to opportunities, your upcoming schedule, and your complete hours history from January 2022 forward.
              </p>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="font-semibold text-amber-900 text-sm mb-1">Keep your profile up to date</p>
                <p className="text-amber-800 text-sm">
                  Click your name in the navigation to update your contact info, address, and phone
                  number so we can reach you about upcoming opportunities.
                </p>
              </div>
              <p>
                Use the navigation above to find volunteer opportunities, view your schedule,
                and print your hours report.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/opportunities"
              className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-4 rounded-2xl font-semibold transition-colors text-center text-sm shadow-sm"
            >
              View Opportunities
            </Link>
            <Link
              href="/my-schedule"
              className="bg-white hover:bg-gray-50 text-gray-800 px-5 py-4 rounded-2xl font-semibold transition-colors text-center text-sm border border-gray-100 shadow-sm"
            >
              My Schedule
            </Link>
            <Link
              href="/volunteer-hours"
              className="bg-white hover:bg-gray-50 text-gray-800 px-5 py-4 rounded-2xl font-semibold transition-colors text-center text-sm border border-gray-100 shadow-sm"
            >
              My Hours Report
            </Link>
            <Link
              href="/profile"
              className="bg-white hover:bg-gray-50 text-gray-800 px-5 py-4 rounded-2xl font-semibold transition-colors text-center text-sm border border-gray-100 shadow-sm"
            >
              Edit My Profile
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
