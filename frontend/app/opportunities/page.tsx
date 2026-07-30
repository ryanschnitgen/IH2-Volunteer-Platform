"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/formatTime";
import ConfirmModal from "@/components/ConfirmModal";

type ViewMode = "calendar" | "list";

interface Opportunity {
  _id: string;
  title: string;
  organization: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  eventType: string;
  eventCategory: string;
  spotsAvailable: number;
  spotsRemaining: number;
  status: string;
}

interface Registration {
  _id: string;
  eventId: string;
  userId: string;
  userEmail: string;
  userName: string;
  additionalAttendees: number;
  attendeeNames: string[];
  totalAttendees: number;
  cancelled: boolean;
  checkedIn: boolean;
  attended: boolean;
  isGroupCheckIn: boolean;
}

export default function Opportunities() {
  const { user, loading: authLoading, waiverSigned } = useAuth();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  // Group registration modal states
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Opportunity | null>(null);
  const [isGroupRegistration, setIsGroupRegistration] = useState(false);
  const [isGroupCheckIn, setIsGroupCheckIn] = useState(false); // Checking in for guests without accounts
  const [additionalAttendees, setAdditionalAttendees] = useState(0);
  const [attendeeNames, setAttendeeNames] = useState<string[]>([]);

  // Edit registration states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState<any>(null);
  const [cancellingEventId, setCancellingEventId] = useState<string | null>(null);

  // Filter states
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterOnlyAvailable, setFilterOnlyAvailable] = useState<boolean>(false);

  // Confirm modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ title: "", message: "", onConfirm: () => {} });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadOpportunities();
      loadRegistrations();
    }
  }, [user]);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/events?status=active");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load opportunities");
      }

      setOpportunities(data.events);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRegistrations = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/events/registrations?userId=${user.uid}`);
      const data = await response.json();

      if (response.ok) {
        setRegistrations(data.registrations || []);
      }
    } catch (err) {
      console.error("Error loading registrations:", err);
    }
  };

  const openRegistrationModal = (opportunity: Opportunity) => {
    // Check if waiver is signed before allowing registration
    if (!waiverSigned) {
      setConfirmModalData({
        title: "Waiver Required",
        message: "You must sign the volunteer waiver before registering for events. You'll be redirected to the waiver page.",
        onConfirm: () => {
          setShowConfirmModal(false);
          router.push("/waiver");
        }
      });
      setShowConfirmModal(true);
      return;
    }

    setSelectedEvent(opportunity);
    setShowRegistrationModal(true);
    setIsGroupRegistration(false);
    setIsGroupCheckIn(false);
    setAdditionalAttendees(0);
    setAttendeeNames([]);
    setError(""); // Clear any previous errors
  };

  const closeRegistrationModal = () => {
    setShowRegistrationModal(false);
    setSelectedEvent(null);
    setIsGroupRegistration(false);
    setIsGroupCheckIn(false);
    setAdditionalAttendees(0);
    setAttendeeNames([]);
    setError(""); // Clear any errors
  };

  const copyEventLink = (eventId: string) => {
    const url = `${window.location.origin}/events/${eventId}`;
    navigator.clipboard.writeText(url).then(() => {
      setSuccess("Event link copied to clipboard!");
      setTimeout(() => setSuccess(""), 3000);
    }).catch(() => {
      setError("Failed to copy link");
      setTimeout(() => setError(""), 3000);
    });
  };

  const handleAdditionalAttendeesChange = (count: number) => {
    if (!selectedEvent) return;

    // Calculate maximum allowed based on context
    let maxAllowed: number;
    if (editingRegistration) {
      // When editing, account for spots they're already using
      maxAllowed = selectedEvent.spotsRemaining + (editingRegistration.totalAttendees || 1) - 1;
    } else {
      // When registering new, they can use up to (spotsRemaining - 1) for guests
      maxAllowed = selectedEvent.spotsRemaining - 1;
    }

    // Validate and cap the count
    if (count < 0) {
      count = 0;
    }

    if (count > maxAllowed) {
      setError(`Only ${maxAllowed} guest spot${maxAllowed === 1 ? '' : 's'} available. You tried to add ${count} guest${count === 1 ? '' : 's'}.`);
      count = maxAllowed;
    } else {
      setError(""); // Clear error if within limits
    }

    setAdditionalAttendees(count);
    // Preserve existing names when changing count
    const currentNames = [...attendeeNames];
    if (count > currentNames.length) {
      // Adding more guests - fill with empty strings
      setAttendeeNames([...currentNames, ...new Array(count - currentNames.length).fill('')]);
    } else {
      // Removing guests - keep only the first 'count' names
      setAttendeeNames(currentNames.slice(0, count));
    }
  };

  const handleAttendeeName = (index: number, name: string) => {
    const newNames = [...attendeeNames];
    newNames[index] = name;
    setAttendeeNames(newNames);
  };

  const confirmRegistration = async () => {
    if (!user || !selectedEvent) return;

    // Validate that all attendee names are filled if group registration (but not if group check-in)
    if (isGroupRegistration && additionalAttendees > 0 && !isGroupCheckIn) {
      const allNamesFilled = attendeeNames.every(name => name.trim().length > 0);
      if (!allNamesFilled) {
        alert('Please provide names for all additional attendees');
        return;
      }
    }

    try {
      setRegisteringId(selectedEvent._id);
      const response = await fetch("/api/events/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEvent._id,
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || user.email,
          additionalAttendees: isGroupRegistration ? additionalAttendees : 0,
          attendeeNames: isGroupRegistration && !isGroupCheckIn ? attendeeNames : [],
          isGroupCheckIn: isGroupCheckIn,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register");
      }

      // Close modal and reload data
      closeRegistrationModal();
      await loadOpportunities();
      await loadRegistrations();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRegisteringId(null);
    }
  };

  const getRegistration = (eventId: string) => {
    return registrations.find((r) => r.eventId === eventId && !r.cancelled);
  };

  const openEditModal = (registration: Registration, opportunity: Opportunity) => {
    setEditingRegistration(registration);
    setSelectedEvent(opportunity);
    setShowEditModal(true);
    setIsGroupRegistration(registration.totalAttendees > 1);
    setIsGroupCheckIn(registration.isGroupCheckIn || false);
    setAdditionalAttendees(registration.additionalAttendees || 0);
    setAttendeeNames(registration.attendeeNames || []);
    setError(""); // Clear any previous errors
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingRegistration(null);
    setSelectedEvent(null);
    setIsGroupRegistration(false);
    setIsGroupCheckIn(false);
    setError(""); // Clear any errors
    setAdditionalAttendees(0);
    setAttendeeNames([]);
  };

  const confirmEditRegistration = async () => {
    if (!user || !editingRegistration || !selectedEvent) return;

    // Validate that all attendee names are filled if group registration
    if (isGroupRegistration && additionalAttendees > 0) {
      const allNamesFilled = attendeeNames.every(name => name.trim().length > 0);
      if (!allNamesFilled) {
        alert('Please provide names for all additional attendees');
        return;
      }
    }

    try {
      setRegisteringId(selectedEvent._id);
      const response = await fetch(`/api/events/register/${editingRegistration._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          additionalAttendees: isGroupRegistration ? additionalAttendees : 0,
          attendeeNames: isGroupRegistration && !isGroupCheckIn ? attendeeNames : [],
          isGroupCheckIn: isGroupRegistration ? isGroupCheckIn : false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update registration");
      }

      // Close modal and reload data
      closeEditModal();
      await loadOpportunities();
      await loadRegistrations();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setRegisteringId(null);
    }
  };

  const handleCancelRegistration = async (eventId: string) => {
    if (!user) return;

    // Show custom confirmation modal
    setConfirmModalData({
      title: "Cancel Registration",
      message: "Are you sure you want to cancel this registration?",
      onConfirm: async () => {
        setShowConfirmModal(false);
        await executeCancelRegistration(eventId);
      }
    });
    setShowConfirmModal(true);
  };

  const executeCancelRegistration = async (eventId: string) => {
    if (!user) return;

    try {
      setCancellingEventId(eventId);
      const response = await fetch(
        `/api/events/register?eventId=${eventId}&userId=${user.uid}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel registration");
      }

      // Reload data
      await loadOpportunities();
      await loadRegistrations();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setCancellingEventId(null);
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

  // Filter and sort opportunities
  const filteredAndSortedOpportunities = [...opportunities]
    .filter((opp) => {
      // Filter by category
      if (filterCategory !== "all" && opp.eventCategory !== filterCategory) {
        return false;
      }

      // Filter by date range
      const oppDate = new Date(opp.date);
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        if (oppDate < fromDate) return false;
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (oppDate > toDate) return false;
      }

      // Filter by spots available
      if (filterOnlyAvailable && opp.spotsRemaining <= 0) {
        return false;
      }

      return true;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Keep for backward compatibility
  const sortedOpportunities = filteredAndSortedOpportunities;

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const getOpportunitiesForDate = (date: Date) => {
    return opportunities.filter((opp) => {
      const oppDate = new Date(opp.date);
      return (
        oppDate.getDate() === date.getDate() &&
        oppDate.getMonth() === date.getMonth() &&
        oppDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getGoogleMapsUrl = (location: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Inspired Hearts and Hands ${location}`)}`;
  };

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="page-hero">
        <div className="relative z-10 container mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900">Volunteer Opportunities</h1>
          <p className="text-gray-500 text-sm mt-0.5">Find the perfect opportunity to make a difference</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* View Toggle */}
        <div className="mb-6 flex justify-center">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1 inline-flex gap-1">
            <button
              onClick={() => setViewMode("list")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
                viewMode === "list"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
                viewMode === "calendar"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              Calendar
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Filter</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {Array.from(new Set(opportunities.map(o => o.eventCategory))).sort().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Date From Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Date To Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Spots Available Filter */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterOnlyAvailable}
                  onChange={(e) => setFilterOnlyAvailable(e.target.checked)}
                  className="w-5 h-5 text-primary-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Only show available spots
                </span>
              </label>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(filterCategory !== "all" || filterDateFrom || filterDateTo || filterOnlyAvailable) && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setFilterCategory("all");
                  setFilterDateFrom("");
                  setFilterDateTo("");
                  setFilterOnlyAvailable(false);
                }}
                className="text-sm text-primary-600 hover:text-primary-700 font-semibold"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Calendar View */}
        {viewMode === "calendar" && (
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={previousMonth}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                ← Previous
              </button>
              <h2 className="text-2xl font-bold text-gray-800">
                {currentMonth.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <button
                onClick={nextMonth}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Next →
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center font-semibold text-gray-600 py-2"
                >
                  {day}
                </div>
              ))}

              {/* Empty cells for days before month starts */}
              {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map(
                (_, index) => (
                  <div key={`empty-${index}`} className="h-24"></div>
                )
              )}

              {/* Calendar days */}
              {Array.from({ length: getDaysInMonth(currentMonth) }).map(
                (_, index) => {
                  const dayNumber = index + 1;
                  const date = new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth(),
                    dayNumber
                  );
                  const dayOpportunities = getOpportunitiesForDate(date);
                  const isToday =
                    new Date().toDateString() === date.toDateString();

                  return (
                    <div
                      key={dayNumber}
                      className={`border rounded-lg p-2 h-24 overflow-y-auto ${
                        isToday ? "bg-blue-50 border-blue-300" : "bg-white"
                      }`}
                    >
                      <div className="font-semibold text-gray-700 mb-1">
                        {dayNumber}
                      </div>
                      {dayOpportunities.map((opp) => {
                        const registration = getRegistration(opp._id);
                        const isRegistered = !!registration;

                        return (
                          <div
                            key={opp._id}
                            onClick={() => {
                              if (isRegistered) {
                                openEditModal(registration, opp);
                              } else {
                                openRegistrationModal(opp);
                              }
                            }}
                            className={`text-xs px-1 py-0.5 rounded mb-1 cursor-pointer transition ${
                              isRegistered
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-primary-100 text-primary-800 hover:bg-primary-200"
                            }`}
                            title={`${opp.title} - ${formatTime(opp.startTime)}${isRegistered ? " (Registered)" : ""}`}
                          >
                            {isRegistered ? "✓ " : ""}{opp.title}
                          </div>
                        );
                      })}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-700 mb-4">
              {sortedOpportunities.length} upcoming {sortedOpportunities.length === 1 ? "opportunity" : "opportunities"}
            </h2>
            {sortedOpportunities.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-500 text-sm">No active opportunities right now — check back soon.</p>
              </div>
            ) : (
              sortedOpportunities.map((opportunity) => {
                const registration = getRegistration(opportunity._id);
                const isFull = opportunity.spotsRemaining <= 0;

                return (
                  <div
                    key={opportunity._id}
                    className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-gray-200 hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {opportunity.title}
                            </h3>
                            <p className="text-primary-600 text-sm font-medium mt-0.5">
                              {opportunity.organization}
                            </p>
                          </div>
                          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                            {opportunity.eventCategory}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <p className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-medium text-gray-800">
                              {formatDate(new Date(opportunity.date))}
                            </span>
                          </p>
                          <p className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{formatTime(opportunity.startTime)} – {formatTime(opportunity.endTime)}</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <a
                              href={getGoogleMapsUrl(opportunity.location)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              {opportunity.location}
                            </a>
                          </p>
                          <p className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>
                              <span className={opportunity.spotsRemaining <= 3 && opportunity.spotsRemaining > 0 ? "text-amber-600 font-semibold" : ""}>
                                {opportunity.spotsRemaining}
                              </span>
                              {" "}/ {opportunity.spotsAvailable} spots available
                            </span>
                          </p>
                          {registration && registration.totalAttendees > 1 && (
                            <p className="flex items-center gap-2 text-green-700 font-medium">
                              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Registered with {registration.totalAttendees} {registration.totalAttendees === 1 ? 'person' : 'people'}</span>
                            </p>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 leading-relaxed">
                          {opportunity.description}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        {registration ? (
                          <>
                            <button
                              onClick={() => openEditModal(registration, opportunity)}
                              disabled={registeringId === opportunity._id || cancellingEventId === opportunity._id}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Edit Registration
                            </button>
                            <button
                              onClick={() => handleCancelRegistration(opportunity._id)}
                              disabled={registeringId === opportunity._id || cancellingEventId === opportunity._id}
                              className="bg-red-50 text-red-600 px-5 py-2.5 rounded-xl hover:bg-red-100 transition text-sm font-semibold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {cancellingEventId === opportunity._id ? "Cancelling..." : "Cancel"}
                            </button>
                          </>
                        ) : isFull ? (
                          <button
                            disabled
                            className="bg-gray-100 text-gray-400 px-6 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap cursor-not-allowed"
                          >
                            Event Full
                          </button>
                        ) : (
                          <button
                            onClick={() => openRegistrationModal(opportunity)}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition"
                          >
                            Sign Up
                          </button>
                        )}
                        {opportunity.status === "active" && (
                          <button
                            onClick={() => copyEventLink(opportunity._id)}
                            className="bg-gray-50 hover:bg-gray-100 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition flex items-center justify-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Share
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {showRegistrationModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Sign Up for {selectedEvent.title}
            </h2>

            {/* Event Details Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Date:</strong> {formatDate(new Date(selectedEvent.date))}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Time:</strong> {formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Location:</strong>{" "}
                <a
                  href={getGoogleMapsUrl(selectedEvent.location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {selectedEvent.location}
                </a>
              </p>
              <p className="text-sm text-gray-600">
                <strong>Available Spots:</strong> {selectedEvent.spotsRemaining} / {selectedEvent.spotsAvailable}
              </p>
            </div>

            {/* Group Registration Option */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGroupRegistration}
                  onChange={(e) => {
                    setIsGroupRegistration(e.target.checked);
                    if (!e.target.checked) {
                      setAdditionalAttendees(0);
                      setAttendeeNames([]);
                      setIsGroupCheckIn(false);
                    }
                  }}
                  className="w-5 h-5 text-primary-600"
                />
                <span className="text-gray-700 font-medium">
                  I'm registering for multiple people (group/family)
                </span>
              </label>
            </div>

            {/* Additional Attendees Section */}
            {isGroupRegistration && (
              <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-blue-50">
                <h3 className="font-semibold text-gray-900 mb-3">Group Details</h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How many additional people? (not including yourself)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={selectedEvent.spotsRemaining - 1}
                    value={additionalAttendees}
                    onChange={(e) => handleAdditionalAttendeesChange(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  {error && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Total attendees:</strong> You + {additionalAttendees} = {1 + additionalAttendees} {1 + additionalAttendees === 1 ? 'person' : 'people'}
                  </p>
                </div>

                {/* Group Check-in Type Checkbox */}
                {additionalAttendees > 0 && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isGroupCheckIn}
                        onChange={(e) => {
                          setIsGroupCheckIn(e.target.checked);
                          if (e.target.checked) {
                            setAttendeeNames([]);
                          }
                        }}
                        className="w-5 h-5 text-primary-600 mt-0.5"
                      />
                      <div>
                        <span className="text-gray-900 font-medium block">
                          ☑️ I'm bringing family/guests who won't check in separately
                        </span>
                        <span className="text-sm text-gray-600 block mt-1">
                          (Kids, family members, or guests without volunteer accounts)
                        </span>
                      </div>
                    </label>
                  </div>
                )}

                {/* Attendee Names - Only show if NOT group check-in */}
                {additionalAttendees > 0 && !isGroupCheckIn && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Names of additional attendees:
                      <span className="text-xs text-gray-500 ml-2">(Each person will check in separately)</span>
                    </label>
                    <div className="space-y-2">
                      {Array.from({ length: additionalAttendees }).map((_, index) => (
                        <input
                          key={index}
                          type="text"
                          placeholder={`Person ${index + 1} name`}
                          value={attendeeNames[index] || ''}
                          onChange={(e) => handleAttendeeName(index, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeRegistrationModal}
                disabled={registeringId === selectedEvent._id}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRegistration}
                disabled={registeringId === selectedEvent._id}
                className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50"
              >
                {registeringId === selectedEvent._id ? 'Registering...' : 'Confirm Registration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Registration Modal */}
      {showEditModal && selectedEvent && editingRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Edit Registration for {selectedEvent.title}
            </h2>

            {/* Event Details Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Date:</strong> {formatDate(new Date(selectedEvent.date))}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Time:</strong> {formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Location:</strong>{" "}
                <a
                  href={getGoogleMapsUrl(selectedEvent.location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {selectedEvent.location}
                </a>
              </p>
              <p className="text-sm text-gray-600">
                <strong>Available Spots:</strong> {selectedEvent.spotsRemaining + (editingRegistration.totalAttendees || 1)} / {selectedEvent.spotsAvailable}
                <span className="text-xs text-gray-500 ml-2">(including your current reservation)</span>
              </p>
            </div>

            {/* Current Registration Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Currently Registered:</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-blue-700 font-semibold">1.</span>
                  <span className="text-gray-900">{editingRegistration.userName} (You)</span>
                </div>
                {editingRegistration.attendeeNames && editingRegistration.attendeeNames.length > 0 ? (
                  editingRegistration.attendeeNames.map((name: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-blue-700 font-semibold">{index + 2}.</span>
                      <span className="text-gray-900">{name}</span>
                    </div>
                  ))
                ) : editingRegistration.totalAttendees > 1 ? (
                  <div className="text-gray-600 italic">
                    + {editingRegistration.additionalAttendees} additional guest(s) (names not provided)
                  </div>
                ) : null}
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <span className="text-sm font-semibold text-gray-700">
                  Total: {editingRegistration.totalAttendees} {editingRegistration.totalAttendees === 1 ? 'person' : 'people'}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Edit Your Registration:</h3>
              <p className="text-sm text-gray-600">Make changes below to add or remove guests from your registration.</p>
            </div>

            {/* Group Registration Option */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGroupRegistration}
                  onChange={(e) => {
                    setIsGroupRegistration(e.target.checked);
                    if (!e.target.checked) {
                      setAdditionalAttendees(0);
                      setAttendeeNames([]);
                    }
                  }}
                  className="w-5 h-5 text-primary-600"
                />
                <span className="text-gray-700 font-medium">
                  I'm registering for multiple people (group/family)
                </span>
              </label>
              {!isGroupRegistration && editingRegistration.totalAttendees > 1 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <strong>Note:</strong> Unchecking this will remove all {editingRegistration.additionalAttendees} guest(s) from your registration.
                </div>
              )}
            </div>

            {/* Additional Attendees Section */}
            {isGroupRegistration && (
              <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-blue-50">
                <h3 className="font-semibold text-gray-900 mb-3">Group Details</h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How many additional people? (not including yourself)
                    <span className="text-xs text-gray-500 ml-2">(Reduce this number to remove guests from the bottom of the list)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={selectedEvent.spotsRemaining + (editingRegistration.totalAttendees || 1) - 1}
                    value={additionalAttendees}
                    onChange={(e) => handleAdditionalAttendeesChange(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  {error && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Total attendees:</strong> You + {additionalAttendees} = {1 + additionalAttendees} {1 + additionalAttendees === 1 ? 'person' : 'people'}
                  </p>
                </div>

                {/* Attendee Names */}
                {additionalAttendees > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Names of additional attendees:
                    </label>
                    <div className="space-y-2">
                      {Array.from({ length: additionalAttendees }).map((_, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 w-6">{index + 1}.</span>
                          <input
                            type="text"
                            placeholder={`Guest ${index + 1} name`}
                            value={attendeeNames[index] || ''}
                            onChange={(e) => handleAttendeeName(index, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      ))}
                    </div>
                    {editingRegistration.attendeeNames && editingRegistration.attendeeNames.length > additionalAttendees && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        <strong>Removing {editingRegistration.attendeeNames.length - additionalAttendees} guest(s):</strong> {editingRegistration.attendeeNames.slice(additionalAttendees).join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeEditModal}
                disabled={registeringId === selectedEvent._id}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmEditRegistration}
                disabled={registeringId === selectedEvent._id}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50"
              >
                {registeringId === selectedEvent._id ? 'Updating...' : 'Update Registration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title={confirmModalData.title}
        message={confirmModalData.message}
        onConfirm={confirmModalData.onConfirm}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}
