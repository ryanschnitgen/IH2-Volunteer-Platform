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
      setLoadingHours(true);
      Promise.all([loadYearlyHours(), loadCommunityHours()]).finally(() => setLoadingHours(false));
    }
  }, [user]);

  const loadCommunityHours = async () => {
    if (!user) return;
    try {
      const currentYear = new Date().getFullYear();
      const adminEmail = encodeURIComponent(user.email || '');
      const [hoursRes, registrationsRes] = await Promise.all([
        fetch(`/api/hours/all?userId=${user.uid}&adminEmail=${adminEmail}`),
        fetch(`/api/events/registrations/all?userId=${user.uid}&adminEmail=${adminEmail}`)
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
          .filter((log: any) => new Date(log.date).getFullYear() === currentYear && !log.autoAssigned && !log.pendingApproval)
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
      const [registrationsRes, hoursLogsRes] = await Promise.all([
        fetch(`/api/events/registrations?userId=${user.uid}`),
        fetch(`/api/hours?userId=${user.uid}`)
      ]);

      if (!registrationsRes.ok || !hoursLogsRes.ok) return;

      const registrationsData = await registrationsRes.json();
      const hoursLogsData = await hoursLogsRes.json();

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();

      const eventHours = (registrationsData.registrations || [])
        .filter((reg: any) => new Date(reg.eventDate).getFullYear() === currentYear && (reg.attended || reg.checkedIn) && !reg.cancelled)
        .reduce((sum: number, reg: any) => sum + (reg.hoursCompleted || 0), 0);

      const manualHours = (hoursLogsData.hoursLogs || [])
        .filter((log: any) => new Date(log.date).getFullYear() === currentYear && !log.autoAssigned && !log.pendingApproval)
        .reduce((sum: number, log: any) => sum + (log.hours || 0), 0);

      const monthEventHours = (registrationsData.registrations || [])
        .filter((reg: any) => {
          const d = new Date(reg.eventDate);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth && (reg.attended || reg.checkedIn) && !reg.cancelled;
        })
        .reduce((sum: number, reg: any) => sum + (reg.hoursCompleted || 0), 0);

      const monthManualHours = (hoursLogsData.hoursLogs || [])
        .filter((log: any) => {
          const d = new Date(log.date);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth && !log.autoAssigned && !log.pendingApproval;
        })
        .reduce((sum: number, log: any) => sum + (log.hours || 0), 0);

      setYearlyHours(eventHours + manualHours);
      setMonthlyHours(monthEventHours + monthManualHours);
    } catch (err) {
      console.error("Error loading yearly hours:", err);
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
        <div className="relative z-10 container mx-auto px-4 max-w-5xl">
          <p className="text-xs font-semibold text-primary-600 uppercase tracking-widest mb-3">IH2 Volunteer Portal</p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-sm">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Good to see you, {firstName}</h1>
              <p className="text-gray-400 text-sm mt-0.5">{user.email}</p>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">This Month</p>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-blue-600 tabular-nums">
              {loadingHours ? <span className="text-gray-200 animate-pulse">—</span> : monthlyHours.toFixed(1)}
            </p>
            <p className="text-sm text-gray-500 mt-2">hours volunteered</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{new Date().getFullYear()} Total</p>
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-primary-600 tabular-nums">
              {loadingHours ? <span className="text-gray-200 animate-pulse">—</span> : yearlyHours.toFixed(1)}
            </p>
            <p className="text-sm text-gray-500 mt-2">your hours this year</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Community {new Date().getFullYear()}</p>
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-green-600 tabular-nums">
              {loadingHours ? <span className="text-gray-200 animate-pulse">—</span> : communityHours.toFixed(1)}
            </p>
            <p className="text-sm text-gray-500 mt-2">all volunteers combined</p>
          </div>
        </div>

        {/* Welcome + Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Making a difference together</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Since 2012, Inspired Hearts and Hands has been at the heart of our community — delivering
              food, supporting families in need, and building real, lasting connections. Every hour you
              give makes that mission possible. We&apos;re glad you&apos;re here.
            </p>
            <div className="mt-6 pt-6 border-t border-gray-100 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Is your profile up to date?</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Your contact info helps us reach you about the right opportunities.{" "}
                  <Link href="/profile" className="text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap">Update now →</Link>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <Link href="/opportunities" className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-4 rounded-2xl transition-colors shadow-sm">
              <p className="font-semibold text-sm">Find Opportunities</p>
              <p className="text-xs text-white/60 mt-0.5">Browse upcoming events</p>
            </Link>
            <Link href="/my-schedule" className="bg-white hover:bg-gray-50 text-gray-800 px-5 py-4 rounded-2xl transition-colors border border-gray-100 shadow-sm flex items-center justify-between group">
              <div>
                <p className="font-semibold text-sm">My Schedule</p>
                <p className="text-xs text-gray-400 mt-0.5">Upcoming commitments</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="/volunteer-hours" className="bg-white hover:bg-gray-50 text-gray-800 px-5 py-4 rounded-2xl transition-colors border border-gray-100 shadow-sm flex items-center justify-between group">
              <div>
                <p className="font-semibold text-sm">Hours Report</p>
                <p className="text-xs text-gray-400 mt-0.5">View &amp; print your history</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="/profile" className="bg-white hover:bg-gray-50 text-gray-800 px-5 py-4 rounded-2xl transition-colors border border-gray-100 shadow-sm flex items-center justify-between group">
              <div>
                <p className="font-semibold text-sm">Edit Profile</p>
                <p className="text-xs text-gray-400 mt-0.5">Contact info &amp; preferences</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
