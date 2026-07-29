"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/formatTime";
import ConfirmModal from "@/components/ConfirmModal";

interface ScheduledEvent {
  _id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  userEmail: string;
  userName: string;
  cancelled: boolean;
  cancellationReason: string;
  additionalAttendees: number;
  attendeeNames: string[];
  totalAttendees: number;
  hoursCompleted?: number;
  checkedIn?: boolean;
}

interface EventDetails {
  _id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  organization: string;
}

export default function MySchedule() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [registrations, setRegistrations] = useState<ScheduledEvent[]>([]);
  const [eventDetails, setEventDetails] = useState<{ [key: string]: EventDetails }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showPastEvents, setShowPastEvents] = useState(false);

  // Edit registration states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState<ScheduledEvent | null>(null);
  const [isGroupRegistration, setIsGroupRegistration] = useState(false);
  const [additionalAttendees, setAdditionalAttendees] = useState(0);
  const [attendeeNames, setAttendeeNames] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

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
      loadSchedule();
    }
  }, [user]);

  const loadSchedule = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch registrations
      const regResponse = await fetch(`/api/events/registrations?userId=${user.uid}`);
      const regData = await regResponse.json();

      if (!regResponse.ok) {
        throw new Error(regData.error || "Failed to load schedule");
      }

      setRegistrations(regData.registrations);

      // Fetch event details for each registration
      const eventsResponse = await fetch("/api/events");
      const eventsData = await eventsResponse.json();

      if (eventsResponse.ok) {
        const detailsMap: { [key: string]: EventDetails } = {};
        eventsData.events.forEach((event: EventDetails) => {
          detailsMap[event._id] = event;
        });
        setEventDetails(detailsMap);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      setCancellingId(eventId);
      const response = await fetch(
        `/api/events/register?eventId=${eventId}&userId=${user.uid}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel registration");
      }

      // Reload schedule
      await loadSchedule();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setCancellingId(null);
    }
  };

  const openEditModal = (registration: ScheduledEvent) => {
    setEditingRegistration(registration);
    setShowEditModal(true);
    setIsGroupRegistration(registration.totalAttendees > 1);
    setAdditionalAttendees(registration.additionalAttendees || 0);
    setAttendeeNames(registration.attendeeNames || []);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingRegistration(null);
    setIsGroupRegistration(false);
    setAdditionalAttendees(0);
    setAttendeeNames([]);
  };

  const handleAdditionalAttendeesChange = (count: number) => {
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

  const confirmEditRegistration = async () => {
    if (!user || !editingRegistration) return;

    // Validate that all attendee names are filled if group registration
    if (isGroupRegistration && additionalAttendees > 0) {
      const allNamesFilled = attendeeNames.every(name => name.trim().length > 0);
      if (!allNamesFilled) {
        setError('Please provide names for all additional attendees');
        setTimeout(() => setError(""), 3000);
        return;
      }
    }

    try {
      setUpdating(true);
      const response = await fetch(`/api/events/register/${editingRegistration._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          additionalAttendees: isGroupRegistration ? additionalAttendees : 0,
          attendeeNames: isGroupRegistration ? attendeeNames : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update registration");
      }

      // Close modal and reload schedule
      closeEditModal();
      await loadSchedule();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  const formatDateForICS = (dateStr: string, time: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    let hour: number, minute: number;
    if (time.includes(' ')) {
      const [timeStr, period] = time.split(' ');
      const [h, m] = timeStr.split(':').map(Number);
      hour = period === 'PM' && h !== 12 ? h + 12 : period === 'AM' && h === 12 ? 0 : h;
      minute = m;
    } else {
      const [h, m] = time.split(':').map(Number);
      hour = h;
      minute = m;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;
  };

  const addToCalendar = (registration: ScheduledEvent) => {
    const event = eventDetails[registration.eventId];
    if (!event) return;

    const startDateTime = formatDateForICS(event.date, event.startTime);
    const endDateTime = formatDateForICS(event.date, event.endTime);

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//IH2 Volunteer Portal//EN
BEGIN:VEVENT
DTSTART:${startDateTime}
DTEND:${endDateTime}
SUMMARY:${event.title}
DESCRIPTION:${event.description}\\n\\nOrganization: ${event.organization}
LOCATION:${event.location}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.title.replace(/\s+/g, "_")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  // Filter and sort registrations by event date
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Set to start of day for comparison

  const upcomingRegistrations = registrations.filter((reg) => {
    const eventDate = new Date(reg.eventDate);
    return eventDate >= now && !reg.cancelled;
  }).sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  const pastRegistrations = registrations.filter((reg) => {
    const eventDate = new Date(reg.eventDate);
    return eventDate < now && !reg.cancelled;
  }).sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

  const displayedRegistrations = showPastEvents ? pastRegistrations : upcomingRegistrations;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="page-hero">
        <div className="relative z-10 container mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>
          <p className="text-gray-500 text-sm mt-0.5">Your upcoming volunteer commitments</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {registrations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
            <p className="text-gray-500 text-sm mb-4">No scheduled events yet.</p>
            <a href="/opportunities" className="inline-block bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition">
              Browse Opportunities
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Toggle between upcoming and past events */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-gray-700">
                {showPastEvents ? "Past" : "Upcoming"} — {displayedRegistrations.filter(r => eventDetails[r.eventId]).length} {displayedRegistrations.filter(r => eventDetails[r.eventId]).length === 1 ? "event" : "events"}
              </h2>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1 inline-flex gap-1">
                <button
                  onClick={() => setShowPastEvents(false)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                    !showPastEvents ? "bg-primary-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  Upcoming ({upcomingRegistrations.length})
                </button>
                <button
                  onClick={() => setShowPastEvents(true)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                    showPastEvents ? "bg-primary-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  Past ({pastRegistrations.length})
                </button>
              </div>
            </div>

            {displayedRegistrations.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <p className="text-gray-500 text-sm">
                  {showPastEvents ? "No past events on record." : "Nothing scheduled — browse opportunities to get started."}
                </p>
              </div>
            ) : (
              displayedRegistrations.map((registration) => {
              const event = eventDetails[registration.eventId];
              if (!event) {
                console.warn('Event not found for registration:', {
                  registrationId: registration._id,
                  eventId: registration.eventId,
                  eventTitle: registration.eventTitle
                });
                return (
                  <div key={registration._id} className="bg-yellow-50 border border-yellow-300 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex-1">
                        <h3 className="font-semibold text-yellow-900 mb-1">Event No Longer Available</h3>
                        <p className="text-yellow-800 text-sm mb-2">
                          You were registered for "<strong>{registration.eventTitle}</strong>", but this event has been deleted or is no longer available.
                        </p>
                        <button
                          onClick={() => handleCancelRegistration(registration.eventId)}
                          disabled={cancellingId === registration.eventId}
                          className="text-sm bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition font-semibold disabled:opacity-50"
                        >
                          {cancellingId === registration.eventId ? "Removing..." : "Remove from My Schedule"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              const isCancelled = registration.cancelled;
              const eventDate = new Date(event.date);
              const isPastEvent = eventDate < now;

              return (
                <div
                  key={registration._id}
                  className={`bg-white border rounded-2xl p-6 transition-all ${
                    isCancelled ? 'border-red-200 bg-red-50' : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
                  }`}
                >
                  {isCancelled && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-red-800 font-semibold mb-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>EVENT CANCELLED</span>
                      </div>
                      {registration.cancellationReason && (
                        <p className="text-sm text-red-700">
                          {registration.cancellationReason}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className={`text-xl font-bold ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {event.title}
                          </h3>
                          <p className={`font-medium ${isCancelled ? 'text-gray-400' : 'text-primary-600'}`}>
                            {event.organization}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          isCancelled ? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {event.category}
                        </span>
                      </div>

                      <div className={`space-y-2 text-sm mb-4 ${isCancelled ? 'text-gray-400' : 'text-gray-600'}`}>
                        <p className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-medium text-gray-800">{formatDate(event.date)}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatTime(event.startTime)} – {formatTime(event.endTime)}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <a href={getGoogleMapsUrl(event.location)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 hover:underline">
                            {event.location}
                          </a>
                        </p>
                        {registration.totalAttendees > 1 && (
                          <p className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="font-medium">Group of {registration.totalAttendees} (you + {registration.additionalAttendees} {registration.additionalAttendees === 1 ? 'other' : 'others'})</span>
                          </p>
                        )}
                      </div>

                      {registration.totalAttendees > 1 && (
                        <div className={`mb-4 p-3 rounded-lg border ${isCancelled ? 'bg-gray-100 border-gray-300' : 'bg-blue-50 border-blue-200'}`}>
                          <p className={`font-semibold mb-2 ${isCancelled ? 'text-gray-600' : 'text-blue-900'}`}>
                            Who's Attending ({registration.totalAttendees} people):
                          </p>
                          <ul className={`space-y-1 ${isCancelled ? 'text-gray-500' : 'text-gray-700'}`}>
                            <li className="flex items-center gap-2">
                              <span className="font-semibold">1.</span>
                              <span>{registration.userName} (You)</span>
                            </li>
                            {registration.attendeeNames && registration.attendeeNames.length > 0 ? (
                              registration.attendeeNames.map((name, index) => (
                                <li key={index} className="flex items-center gap-2">
                                  <span className="font-semibold">{index + 2}.</span>
                                  <span>{name}</span>
                                </li>
                              ))
                            ) : (
                              <li className="italic text-gray-500">
                                + {registration.additionalAttendees} additional guest(s) - click "Edit Registration" to add names
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      <p className={`mb-4 ${isCancelled ? 'text-gray-500' : 'text-gray-700'}`}>
                        {event.description}
                      </p>
                    </div>

                    {/* Show action buttons for upcoming events or hours status for past events */}
                    <div className="flex flex-col gap-2">
                      {!isPastEvent && !isCancelled ? (
                        <>
                          <button
                            onClick={() => addToCalendar(registration)}
                            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition flex items-center gap-2"
                          >
                            <span>📅</span>
                            Add to Calendar
                          </button>
                          <button
                            onClick={() => openEditModal(registration)}
                            disabled={updating || cancellingId === registration.eventId}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Edit Registration
                          </button>
                          <button
                            onClick={() => handleCancelRegistration(registration.eventId)}
                            disabled={cancellingId === registration.eventId || updating}
                            className="bg-red-50 text-red-600 px-5 py-2.5 rounded-xl hover:bg-red-100 transition text-sm font-semibold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {cancellingId === registration.eventId
                              ? "Cancelling..."
                              : "Cancel Registration"}
                          </button>
                        </>
                      ) : isPastEvent && !isCancelled ? (
                        <div className="bg-white border-2 rounded-lg p-4">
                          {registration.hoursCompleted && registration.hoursCompleted > 0 ? (
                            <div className="text-center">
                              <div className="text-3xl font-bold text-green-700 mb-1">
                                {registration.hoursCompleted.toFixed(2)}
                              </div>
                              <div className="text-sm text-gray-600">
                                Hours Assigned
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                ✓ Completed
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-yellow-600 mb-1">
                                ⏳
                              </div>
                              <div className="text-sm font-semibold text-yellow-700">
                                Hours Pending
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                Admin hasn't assigned hours yet
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
              })
            )}
          </div>
        )}
      </div>

      {/* Edit Registration Modal */}
      {showEditModal && editingRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Edit Registration for {eventDetails[editingRegistration.eventId]?.title}
            </h2>

            {/* Event Details Summary */}
            {eventDetails[editingRegistration.eventId] && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Date:</strong> {formatDate(eventDetails[editingRegistration.eventId].date)}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Time:</strong> {formatTime(eventDetails[editingRegistration.eventId].startTime)} - {formatTime(eventDetails[editingRegistration.eventId].endTime)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Location:</strong>{" "}
                  <a
                    href={getGoogleMapsUrl(eventDetails[editingRegistration.eventId].location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {eventDetails[editingRegistration.eventId].location}
                  </a>
                </p>
              </div>
            )}

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
              {!isGroupRegistration && editingRegistration && editingRegistration.totalAttendees > 1 && (
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
                    max={20}
                    value={additionalAttendees}
                    onChange={(e) => handleAdditionalAttendeesChange(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
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
                    {editingRegistration && editingRegistration.attendeeNames && editingRegistration.attendeeNames.length > additionalAttendees && (
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
                disabled={updating}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmEditRegistration}
                disabled={updating}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Registration'}
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
