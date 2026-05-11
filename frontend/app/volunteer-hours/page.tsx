"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface VolunteerEvent {
  _id: string;
  eventTitle: string;
  eventDescription?: string;
  hoursCompleted: number;
  eventDate: string;
  eventCategory: string;
  attended: boolean;
}

interface VolunteerProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  lifetimeHours: number;
  linkedUserId?: string;
}

interface HoursLog {
  _id: string;
  hours: number;
  date: string;
  autoAssigned: boolean;
  notes?: string;
}

export default function VolunteerHours() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [volunteerEvents, setVolunteerEvents] = useState<VolunteerEvent[]>([]);
  const [volunteerProfile, setVolunteerProfile] = useState<VolunteerProfile | null>(null);
  const [manualHoursLogs, setManualHoursLogs] = useState<HoursLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadVolunteerHours();
    }
  }, [user]);

  const loadVolunteerHours = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch event registrations, volunteer profile, and manual hours logs in parallel
      const [registrationsRes, profileRes, hoursLogsRes] = await Promise.all([
        fetch(`/api/events/registrations?userId=${user.uid}`),
        fetch(`/api/volunteers?userId=${user.uid}`),
        fetch(`/api/hours?userId=${user.uid}`)
      ]);

      const registrationsData = await registrationsRes.json();
      const profileData = await profileRes.json();
      const hoursLogsData = await hoursLogsRes.json();

      if (registrationsRes.ok) {
        // Filter for attended or checked-in events
        const attendedEvents = registrationsData.registrations.filter((reg: any) => reg.attended || reg.checkedIn);

        // Fetch event details to get descriptions
        const eventsRes = await fetch('/api/events');
        const eventsData = await eventsRes.json();

        // Create a map of event ID to event description
        const eventDescriptions = new Map();
        if (eventsRes.ok && eventsData.events) {
          eventsData.events.forEach((event: any) => {
            eventDescriptions.set(event._id, event.description);
          });
        }

        // Attach descriptions to registrations
        const eventsWithDescriptions = attendedEvents.map((reg: any) => ({
          ...reg,
          eventDescription: eventDescriptions.get(reg.eventId) || ''
        }));

        setVolunteerEvents(eventsWithDescriptions);
      }

      if (profileRes.ok && profileData.profile) {
        setVolunteerProfile(profileData.profile);
      }

      if (hoursLogsRes.ok) {
        // Filter only manually logged hours (not auto-assigned from events)
        const manualLogs = hoursLogsData.hoursLogs?.filter((log: HoursLog) => !log.autoAssigned) || [];
        setManualHoursLogs(manualLogs);
      }
    } catch (err) {
      console.error("Error loading volunteer hours:", err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Calculate total hours from events
  const eventHours = volunteerEvents.reduce((sum, event) => sum + event.hoursCompleted, 0);

  // Calculate manually logged hours
  const manualHours = manualHoursLogs.reduce((sum, log) => sum + log.hours, 0);

  // Add imported lifetime hours from volunteer profile
  const importedHours = volunteerProfile?.lifetimeHours || 0;

  // Total lifetime hours = imported + events + manual
  const lifetimeHours = eventHours + manualHours + importedHours;

  // Calculate yearly hours (current year)
  const currentYear = new Date().getFullYear();
  const yearlyEventHours = volunteerEvents
    .filter(event => new Date(event.eventDate).getFullYear() === currentYear)
    .reduce((sum, event) => sum + event.hoursCompleted, 0);

  const yearlyManualHours = manualHoursLogs
    .filter(log => new Date(log.date).getFullYear() === currentYear)
    .reduce((sum, log) => sum + log.hours, 0);

  const yearlyHours = yearlyEventHours + yearlyManualHours;

  // Sort events by date (most recent first)
  const sortedEvents = [...volunteerEvents].sort(
    (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Filter events by date range
  const getFilteredEvents = () => {
    if (!startDate && !endDate) return volunteerEvents;

    return volunteerEvents.filter(event => {
      const eventDate = new Date(event.eventDate);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && end) {
        return eventDate >= start && eventDate <= end;
      } else if (start) {
        return eventDate >= start;
      } else if (end) {
        return eventDate <= end;
      }
      return true;
    });
  };

  // Group events by category
  const groupByCategory = (events: VolunteerEvent[]) => {
    const grouped: { [key: string]: VolunteerEvent[] } = {};
    events.forEach(event => {
      if (!grouped[event.eventCategory]) {
        grouped[event.eventCategory] = [];
      }
      grouped[event.eventCategory].push(event);
    });
    return grouped;
  };

  const handlePrint = () => {
    window.print();
  };

  const setDatePreset = (preset: string) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    switch (preset) {
      case 'ytd':
        setStartDate(new Date(year, 0, 1).toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;

      case 'last-month':
        const lastMonthStart = new Date(year, month - 1, 1);
        const lastMonthEnd = new Date(year, month, 0);
        setStartDate(lastMonthStart.toISOString().split('T')[0]);
        setEndDate(lastMonthEnd.toISOString().split('T')[0]);
        break;

      case 'last-quarter':
        const currentQuarter = Math.floor(month / 3);
        const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
        const lastQuarterYear = currentQuarter === 0 ? year - 1 : year;
        const lastQuarterStart = new Date(lastQuarterYear, lastQuarter * 3, 1);
        const lastQuarterEnd = new Date(lastQuarterYear, lastQuarter * 3 + 3, 0);
        setStartDate(lastQuarterStart.toISOString().split('T')[0]);
        setEndDate(lastQuarterEnd.toISOString().split('T')[0]);
        break;

      case 'last-year':
        const lastYearStart = new Date(year - 1, 0, 1);
        const lastYearEnd = new Date(year - 1, 11, 31);
        setStartDate(lastYearStart.toISOString().split('T')[0]);
        setEndDate(lastYearEnd.toISOString().split('T')[0]);
        break;

      case 'clear':
        setStartDate('');
        setEndDate('');
        break;
    }
  };

  const filteredEvents = getFilteredEvents();
  const groupedEvents = groupByCategory(filteredEvents);
  const totalHours = filteredEvents.reduce((sum, e) => sum + e.hoursCompleted, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print Preview Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Report Preview</h2>
              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  Print Report
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-6">
              <div ref={printRef}>
                {/* Printable Report Content */}
                <div className="bg-white p-8">
                  <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">
                      {volunteerProfile ? `${volunteerProfile.lastName}, ${volunteerProfile.firstName}` : user?.displayName || user?.email}
                    </h1>
                    <p className="text-lg font-semibold text-gray-700 mb-4">
                      Volunteer Hours Totals: {startDate ? new Date(startDate).toLocaleDateString('en-US') : '1/1/' + new Date().getFullYear()} - {endDate ? new Date(endDate).toLocaleDateString('en-US') : '12/31/' + new Date().getFullYear()}
                    </p>
                    <div className="text-gray-600 text-sm">
                      <p><strong>Organization:</strong> Inspired Hearts and Hands</p>
                      <p><strong>Phone:</strong> 724-230-6378</p>
                      <p><strong>Email:</strong> info@inspiredheartsandhands.com</p>
                    </div>
                  </div>

                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-800">
                        <th className="text-left py-2 px-4">Category</th>
                        <th className="text-left py-2 px-4">Activity</th>
                        <th className="text-right py-2 px-4">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groupedEvents).map(([category, events]) => {
                        const categoryTotal = events.reduce((sum, e) => sum + e.hoursCompleted, 0);
                        return (
                          <React.Fragment key={category}>
                            {events.map((event, index) => (
                              <tr key={event._id} className="border-b border-gray-300">
                                <td className="py-2 px-4">{index === 0 ? category : ""}</td>
                                <td className="py-2 px-4">{event.eventTitle}</td>
                                <td className="text-right py-2 px-4">{event.hoursCompleted.toFixed(2)}</td>
                              </tr>
                            ))}
                            <tr className="bg-gray-100 font-semibold border-b-2 border-gray-400">
                              <td className="py-2 px-4" colSpan={2}>Category Total Hours</td>
                              <td className="text-right py-2 px-4">{categoryTotal.toFixed(2)}</td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                      <tr className="bg-gray-200 font-bold text-lg border-t-2 border-gray-800">
                        <td className="py-3 px-4" colSpan={2}>Total Hours</td>
                        <td className="text-right py-3 px-4">{totalHours.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="mt-8 border-t pt-6">
                    <p className="text-sm text-gray-600 italic">
                      Thank you for your dedication and service to Inspired Hearts and Hands!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Report (Hidden, only shows when printing) */}
      <div className="hidden print:block">
        <div className="bg-white p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {volunteerProfile ? `${volunteerProfile.lastName}, ${volunteerProfile.firstName}` : user?.displayName || user?.email}
            </h1>
            <p className="text-lg font-semibold text-gray-700 mb-4">
              Volunteer Hours Totals: {startDate ? new Date(startDate).toLocaleDateString('en-US') : '1/1/' + new Date().getFullYear()} - {endDate ? new Date(endDate).toLocaleDateString('en-US') : '12/31/' + new Date().getFullYear()}
            </p>
            <div className="text-gray-600 text-sm">
              <p><strong>Organization:</strong> Inspired Hearts and Hands</p>
              <p><strong>Phone:</strong> 412-897-4034</p>
              <p><strong>Email:</strong> info@inspiredheartsandhands.com</p>
            </div>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="text-left py-2 px-4">Category</th>
                <th className="text-left py-2 px-4">Activity</th>
                <th className="text-right py-2 px-4">Hours</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedEvents).map(([category, events]) => {
                const categoryTotal = events.reduce((sum, e) => sum + e.hoursCompleted, 0);
                return (
                  <React.Fragment key={category}>
                    {events.map((event, index) => (
                      <tr key={event._id || `${category}-${index}`} className="border-b border-gray-300">
                        <td className="py-2 px-4">{index === 0 ? category : ""}</td>
                        <td className="py-2 px-4">{event.eventTitle}</td>
                        <td className="text-right py-2 px-4">{event.hoursCompleted.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-semibold border-b-2 border-gray-400">
                      <td className="py-2 px-4" colSpan={2}>Category Total Hours</td>
                      <td className="text-right py-2 px-4">{categoryTotal.toFixed(2)}</td>
                    </tr>
                  </React.Fragment>
                );
              })}
              <tr className="bg-gray-200 font-bold text-lg border-t-2 border-gray-800">
                <td className="py-3 px-4" colSpan={2}>Total Hours</td>
                <td className="text-right py-3 px-4">{totalHours.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-8 border-t pt-6">
            <p className="text-sm text-gray-600 italic">
              Thank you for your dedication and service to Inspired Hearts and Hands!
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="page-hero print:hidden">
        <div className="relative z-10 container mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900">My Volunteer Hours</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track your volunteer contributions and impact</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Print Report Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8 print:hidden">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Print Volunteer Report</h2>
          <p className="text-sm text-gray-500 mb-5">Select a date range to generate your hours report</p>

          {/* Quick Date Presets */}
          <div className="mb-5 flex flex-wrap gap-2">
            <button onClick={() => setDatePreset('ytd')} className="px-3.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-xs font-medium">Year to Date</button>
            <button onClick={() => setDatePreset('last-month')} className="px-3.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-xs font-medium">Last Month</button>
            <button onClick={() => setDatePreset('last-quarter')} className="px-3.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-xs font-medium">Last Quarter</button>
            <button onClick={() => setDatePreset('last-year')} className="px-3.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-xs font-medium">Last Year</button>
            <button onClick={() => setDatePreset('clear')} className="px-3.5 py-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition text-xs font-medium">Clear</button>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">End date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>
            <button onClick={() => setShowPrintModal(true)} disabled={filteredEvents.length === 0}
              className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed">
              Preview
            </button>
            <button onClick={handlePrint} disabled={filteredEvents.length === 0}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>

          {(startDate || endDate) && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl text-sm text-gray-600">
              {startDate ? new Date(startDate).toLocaleDateString() : "All time"} – {endDate ? new Date(endDate).toLocaleDateString() : "present"} &nbsp;·&nbsp; {filteredEvents.length} events &nbsp;·&nbsp; {totalHours.toFixed(1)} hrs
            </div>
          )}
        </div>

        {/* Hours Summary Cards - Only visible on screen, not in print */}
        <div className="grid md:grid-cols-3 gap-4 mb-8 print:hidden">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lifetime Hours</p>
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-primary-600 tabular-nums">{lifetimeHours.toFixed(1)}</p>
            <p className="text-sm text-gray-500 mt-2">hours total</p>
            {(importedHours > 0 || manualHours > 0) && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                {importedHours > 0 && <p className="text-xs text-gray-400">Imported: {importedHours.toFixed(1)} hrs</p>}
                <p className="text-xs text-gray-400">Events: {eventHours.toFixed(1)} hrs</p>
                {manualHours > 0 && <p className="text-xs text-gray-400">Manual: {manualHours.toFixed(1)} hrs</p>}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{new Date().getFullYear()} Hours</p>
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-green-600 tabular-nums">{yearlyHours.toFixed(1)}</p>
            <p className="text-sm text-gray-500 mt-2">hours this year</p>
            {(yearlyEventHours > 0 || yearlyManualHours > 0) && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                {yearlyEventHours > 0 && <p className="text-xs text-gray-400">Events: {yearlyEventHours.toFixed(1)} hrs</p>}
                {yearlyManualHours > 0 && <p className="text-xs text-gray-400">Manual: {yearlyManualHours.toFixed(1)} hrs</p>}
              </div>
            )}
          </div>

          {importedHours > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Imported</p>
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-purple-600 tabular-nums">{importedHours.toFixed(1)}</p>
              <p className="text-sm text-gray-500 mt-2">from legacy system</p>
            </div>
          )}
        </div>

        {/* Volunteer History */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 print:hidden">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Volunteer History</h2>
          {sortedEvents.length === 0 && manualHoursLogs.length === 0 ? (
            <p className="text-gray-400 text-center py-10 text-sm">
              No history yet — sign up for events to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {[
                ...sortedEvents.map(e => ({
                  key: e._id,
                  type: 'event' as const,
                  date: e.eventDate,
                  title: e.eventTitle,
                  category: e.eventCategory,
                  hours: e.hoursCompleted,
                })),
                ...manualHoursLogs.map(l => ({
                  key: l._id,
                  type: 'manual' as const,
                  date: l.date,
                  title: l.notes || 'Manual Hours Entry',
                  category: 'Manual',
                  hours: l.hours,
                })),
              ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((item) => (
                  <div
                    key={item.key}
                    className={`border rounded-2xl p-4 transition-all ${
                      item.type === 'event' ? 'border-gray-100 bg-white hover:border-gray-200' : 'border-gray-100 bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-gray-900 truncate">{item.title}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                            item.type === 'event'
                              ? 'bg-primary-100 text-primary-700'
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {item.category}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">{formatDate(item.date)}</div>
                      </div>
                      <div className={`text-xl font-bold whitespace-nowrap ${
                        item.type === 'event' ? 'text-primary-600' : 'text-gray-600'
                      }`}>
                        {item.hours.toFixed(2)} hrs
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
