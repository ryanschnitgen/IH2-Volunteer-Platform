"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { isAdmin } from "@backend/lib/admin";

type DateRange = 'last365' | 'ytd' | 'custom';

interface AnalyticsData {
  totalUniqueVolunteers: number;
  activeVolunteers: number;
  guestVolunteers: number;
  totalSessions: number;
  totalHours: number;
  signedInVolunteers: number;
  estimatedUniqueGuests: number;
  totalGuests: number;
  dateRange: {
    start: string;
    end: string;
  };
  breakdown: {
    byMonth: Array<{
      month: string;
      uniqueVolunteers: number;
      sessions: number;
      hours: number;
    }>;
  };
}

export default function AdminAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");

  // Date range selection
  const [dateRangeType, setDateRangeType] = useState<DateRange>('ytd');
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin(user.email))) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && isAdmin(user.email)) {
      loadAnalytics();
    }
  }, [user, dateRangeType, customStartDate, customEndDate]);

  const getDateRange = () => {
    const today = new Date();
    let startDate: Date;
    let endDate = today;

    switch (dateRangeType) {
      case 'last365':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 365);
        break;
      case 'ytd':
        startDate = new Date(today.getFullYear(), 0, 1); // January 1st of current year
        break;
      case 'custom':
        if (!customStartDate || !customEndDate) return null;
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        break;
      default:
        return null;
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    };
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const dateRange = getDateRange();
      if (!dateRange) return;

      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
      });

      const response = await fetch(`/api/analytics/volunteer-report?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load analytics");
      }

      setAnalytics(data);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    try {
      setExporting(true);

      const dateRange = getDateRange();
      if (!dateRange) return;

      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
        format: 'csv',
      });

      const response = await fetch(`/api/analytics/volunteer-report?${params}`);

      if (!response.ok) {
        throw new Error("Failed to export report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const rangeName = dateRangeType === 'last365' ? 'Last-365-Days' :
                        dateRangeType === 'ytd' ? 'Year-to-Date' :
                        `${dateRange.start}_to_${dateRange.end}`;

      a.download = `Volunteer-Analytics-${rangeName}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || "Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  if (authLoading || loading) {
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
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Volunteer Analytics
          </h1>
          <p className="text-gray-600">
            Comprehensive volunteer activity reporting and insights
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Date Range</h2>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <button
              onClick={() => setDateRangeType('last365')}
              className={`p-4 rounded-lg border-2 font-semibold transition ${
                dateRangeType === 'last365'
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              Last 365 Days
            </button>
            <button
              onClick={() => setDateRangeType('ytd')}
              className={`p-4 rounded-lg border-2 font-semibold transition ${
                dateRangeType === 'ytd'
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              Year to Date
            </button>
            <button
              onClick={() => setDateRangeType('custom')}
              className={`p-4 rounded-lg border-2 font-semibold transition ${
                dateRangeType === 'custom'
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              Custom Range
            </button>
          </div>

          {dateRangeType === 'custom' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {analytics && (
            <div className="mt-4 text-sm text-gray-600">
              Showing data from <strong>{new Date(analytics.dateRange.start).toLocaleDateString()}</strong> to{' '}
              <strong>{new Date(analytics.dateRange.end).toLocaleDateString()}</strong>
            </div>
          )}
        </div>

        {analytics && (
          <>
            {/* Key Metrics */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Total Unique Volunteers */}
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold uppercase opacity-90">
                    Total Unique Volunteers
                  </h3>
                  <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="text-4xl font-bold mb-1">
                  {analytics.totalUniqueVolunteers.toLocaleString()}
                </div>
                <div className="text-xs opacity-80">
                  Active + Guest volunteers
                </div>
              </div>

              {/* Active Volunteers */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold uppercase opacity-90">
                    Active Volunteers
                  </h3>
                  <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="text-4xl font-bold mb-1">
                  {analytics.activeVolunteers.toLocaleString()}
                </div>
                <div className="text-xs opacity-80">
                  With registered accounts
                </div>
              </div>

              {/* Guest Volunteers */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold uppercase opacity-90">
                    Guest Volunteers
                  </h3>
                  <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="text-4xl font-bold mb-1">
                  {analytics.guestVolunteers.toLocaleString()}
                </div>
                <div className="text-xs opacity-80">
                  Without registered accounts (93% of {analytics.totalGuests} guests)
                </div>
              </div>

              {/* Total Sessions */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold uppercase opacity-90">
                    Total Sessions
                  </h3>
                  <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div className="text-4xl font-bold mb-1">
                  {analytics.totalSessions.toLocaleString()}
                </div>
                <div className="text-xs opacity-80">
                  Check-ins recorded
                </div>
              </div>
            </div>

            {/* Total Hours - Full Width */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-8 mb-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase opacity-90 mb-2">
                    Total Volunteer Hours
                  </h3>
                  <div className="text-5xl font-bold">
                    {analytics.totalHours.toLocaleString()} hours
                  </div>
                  <div className="text-sm opacity-80 mt-2">
                    {(analytics.totalHours / analytics.totalUniqueVolunteers).toFixed(1)} hours per volunteer average
                  </div>
                </div>
                <svg className="w-20 h-20 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Breakdown Details */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Detailed Breakdown</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Volunteer Types</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-gray-700">Signed-In Volunteers:</span>
                      <span className="font-bold text-gray-900">{analytics.signedInVolunteers}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-gray-700">Estimated Unique Guests:</span>
                      <span className="font-bold text-gray-900">{analytics.estimatedUniqueGuests}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-primary-50 rounded border border-primary-200">
                      <span className="text-primary-900 font-semibold">Total Unique:</span>
                      <span className="font-bold text-primary-900">{analytics.totalUniqueVolunteers}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Activity Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-gray-700">Total Check-Ins:</span>
                      <span className="font-bold text-gray-900">{analytics.totalSessions}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-gray-700">Average Sessions/Volunteer:</span>
                      <span className="font-bold text-gray-900">
                        {(analytics.totalSessions / analytics.signedInVolunteers).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-gray-700">Active vs Guest Ratio:</span>
                      <span className="font-bold text-gray-900">
                        {((analytics.activeVolunteers / analytics.totalUniqueVolunteers) * 100).toFixed(0)}% / {((analytics.guestVolunteers / analytics.totalUniqueVolunteers) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Breakdown */}
            {analytics.breakdown && analytics.breakdown.byMonth.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Monthly Breakdown</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Month</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Unique Volunteers</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Sessions</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.breakdown.byMonth.map((month, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-900">{month.month}</td>
                          <td className="py-3 px-4 text-right text-gray-700">{month.uniqueVolunteers}</td>
                          <td className="py-3 px-4 text-right text-gray-700">{month.sessions}</td>
                          <td className="py-3 px-4 text-right text-gray-700">{month.hours}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Export Button */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Export Report</h2>
                  <p className="text-gray-600 text-sm">
                    Download this report as a CSV file for your records
                  </p>
                </div>
                <button
                  onClick={exportToCSV}
                  disabled={exporting}
                  className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {exporting ? "Exporting..." : "Export to CSV"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
