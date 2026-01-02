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
      // Fetch all hours logs for 2026
      const response = await fetch('/api/hours/all');
      const data = await response.json();

      if (response.ok) {
        const currentYear = new Date().getFullYear();
        const totalHours = (data.hoursLogs || [])
          .filter((log: any) => {
            const logDate = new Date(log.date);
            return logDate.getFullYear() === currentYear;
          })
          .reduce((sum: number, log: any) => sum + (log.hours || 0), 0);

        setCommunityHours(totalHours);
      }
    } catch (err) {
      console.error("Error loading community hours:", err);
    }
  };

  const loadYearlyHours = async () => {
    if (!user) return;

    try {
      setLoadingHours(true);

      // Fetch registrations and hours logs
      const [registrationsRes, hoursLogsRes] = await Promise.all([
        fetch(`/api/events/registrations?userId=${user.uid}`),
        fetch(`/api/hours?userId=${user.uid}`)
      ]);

      const registrationsData = await registrationsRes.json();
      const hoursLogsData = await hoursLogsRes.json();

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();

      // Calculate hours from attended events this year
      const eventHours = (registrationsData.registrations || [])
        .filter((reg: any) => {
          const eventDate = new Date(reg.eventDate);
          return eventDate.getFullYear() === currentYear && (reg.attended || reg.checkedIn);
        })
        .reduce((sum: number, reg: any) => sum + (reg.hoursCompleted || 0), 0);

      // Calculate manual hours this year
      const manualHours = (hoursLogsData.hoursLogs || [])
        .filter((log: any) => {
          const logDate = new Date(log.date);
          return logDate.getFullYear() === currentYear && !log.autoAssigned;
        })
        .reduce((sum: number, log: any) => sum + (log.hours || 0), 0);

      // Calculate this month's hours
      const monthEventHours = (registrationsData.registrations || [])
        .filter((reg: any) => {
          const eventDate = new Date(reg.eventDate);
          return eventDate.getFullYear() === currentYear &&
                 eventDate.getMonth() === currentMonth &&
                 (reg.attended || reg.checkedIn);
        })
        .reduce((sum: number, reg: any) => sum + (reg.hoursCompleted || 0), 0);

      const monthManualHours = (hoursLogsData.hoursLogs || [])
        .filter((log: any) => {
          const logDate = new Date(log.date);
          return logDate.getFullYear() === currentYear &&
                 logDate.getMonth() === currentMonth &&
                 !log.autoAssigned;
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Handprints */}
      <div
        className="relative overflow-hidden bg-white py-12 mb-8"
        style={{
          backgroundImage: `url('/handprint.png')`,
          backgroundPosition: 'center',
          backgroundSize: 'auto 100%',
          backgroundRepeat: 'repeat-x'
        }}
      >
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4" style={{ textShadow: '3px 3px 6px rgba(255,255,255,0.9), -2px -2px 4px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.8)' }}>
            Welcome to Your Volunteer Portal
          </h1>
          <p className="text-xl md:text-2xl text-gray-800 font-semibold" style={{ textShadow: '2px 2px 4px rgba(255,255,255,0.9), -1px -1px 2px rgba(255,255,255,0.9)' }}>
            Making a difference together since 2012
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Profile and Hours Section */}
        <section className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-center gap-6 mb-6">
            {/* Profile Image */}
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-3xl font-bold">
              {user.displayName
                ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
                : user.email?.[0].toUpperCase()}
            </div>

            {/* User Info */}
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {user.displayName || user.email?.split('@')[0]}
              </h1>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>

          {/* Volunteer Hours Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-l-4 border-blue-600 shadow-md hover:shadow-lg transition">
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">
                Hours This Month
              </h3>
              <p className="text-4xl font-bold text-blue-700">
                {loadingHours ? "..." : monthlyHours.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Your monthly hours</p>
            </div>

            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6 border-l-4 border-primary-600 shadow-md hover:shadow-lg transition">
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">
                Hours This Year ({new Date().getFullYear()})
              </h3>
              <p className="text-4xl font-bold text-primary-700">
                {loadingHours ? "..." : yearlyHours.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Your yearly hours</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-l-4 border-green-600 shadow-md hover:shadow-lg transition">
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">
                Community Hours {new Date().getFullYear()}
              </h3>
              <p className="text-4xl font-bold text-green-700">
                {loadingHours ? "..." : communityHours.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">All volunteers combined</p>
            </div>
          </div>
        </section>

        {/* Welcome Message Section */}
        <section className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Welcome to Inspired Hearts and Hands (IH2)
          </h2>

          <div className="prose max-w-none text-gray-700 space-y-4">
            <p>
              Welcome to the new and improved Volunteer Portal for Inspired Hearts and Hands (IH2).
              We are so very thankful for the many volunteers that support each of our campaigns.
              As we continue to grow, we need to have a more efficient way for volunteers to view
              available opportunities and signup for activities, while also tracking and managing
              their personal volunteer hours.
            </p>

            <p>
              Your new myImpact Page will provide you first-hand access to the many volunteer IH2
              volunteer opportunities on a real-time basis. We humbly ask that you remain patient
              as we make this transition.
            </p>

            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-orange-400 p-6 my-6 shadow-sm">
              <h3 className="text-lg font-bold text-orange-800 mb-3">IMPORTANT</h3>
              <p>
                We recommend that you update your profile information and contact details. To access
                your profile, simply click on your name in the top right corner of the screen. From
                there, you can update your contact information, address, phone number, and other
                personal details to ensure we can reach you about upcoming volunteer opportunities
                and commitments.
              </p>
            </div>

            <h3 className="text-xl font-bold text-gray-800 mt-8 mb-3">
              NAVIGATION AND SIGNUP
            </h3>
            <p>
              This is the exciting part. Your portal will provide you access to all of the available
              volunteer opportunities, your schedule of commitments, and a report of all completed
              volunteer hours (from January 2022 forward). You are also able to communicate directly
              with us through the system. The menu at the top of the page will help you navigate to
              the various areas of the portal.
            </p>

          </div>

          {/* Quick Actions */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/opportunities"
                className="bg-gradient-to-r from-primary-600 to-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition"
              >
                View Opportunities
              </Link>
              <Link
                href="/my-schedule"
                className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                My Schedule
              </Link>
              <Link
                href="/profile"
                className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                My Profile
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
