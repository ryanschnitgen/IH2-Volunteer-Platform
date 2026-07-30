"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { formatTime } from "@/lib/formatTime";

interface Event {
  _id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  spotsAvailable: number;
  spotsRemaining: number;
  organization: string;
  eventType: string;
  eventCategory: string;
  status: string;
}

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const { user, waiverSigned } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);

  const eventId = params.id as string;

  useEffect(() => {
    if (eventId) {
      loadPageData();
    }
  }, [eventId, user]);

  const loadPageData = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const fetches: Promise<any>[] = [fetch(`/api/events/${eventId}`)];
      if (user) {
        fetches.push(fetch(`/api/events/registrations?userId=${user.uid}`));
      }
      const [eventRes, regRes] = await Promise.all(fetches);

      const eventData = await eventRes.json();
      if (eventRes.ok) {
        setEvent(eventData.event);
      } else {
        setError(eventData.error || "Event not found");
      }

      if (regRes) {
        const regData = await regRes.json();
        if (regRes.ok) {
          const registered = regData.registrations?.some(
            (reg: any) => reg.eventId === eventId && !reg.cancelled
          );
          setIsRegistered(!!registered);
        }
      }
    } catch (err) {
      setError("Failed to load event");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (!waiverSigned) {
      router.push("/waiver");
      return;
    }

    if (!event) return;

    setRegistering(true);
    setError("");

    try {
      const response = await fetch("/api/events/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event._id,
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || user.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register");
      }

      setSuccess("Successfully registered for this event!");
      setIsRegistered(true);
      loadPageData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRegistering(false);
    }
  };

  const getGoogleMapsUrl = (location: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Inspired Hearts and Hands ${location}`)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
          <p className="text-gray-600 mb-6">{error || "This event does not exist."}</p>
          <button
            onClick={() => router.push("/opportunities")}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            Browse All Events
          </button>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.date);
  const isPastEvent = eventDate < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <button
          onClick={() => router.back()}
          className="mb-6 text-primary-600 hover:text-primary-700 font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

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

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-primary-600 text-white p-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-sm mb-3">
                  {event.eventCategory}
                </span>
                <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
                <p className="text-primary-100 text-lg">{event.organization}</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-3">
                <div className="bg-primary-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-semibold text-gray-900">
                    {eventDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-semibold text-gray-900">
                    {formatTime(event.startTime)} - {formatTime(event.endTime)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <a
                    href={getGoogleMapsUrl(event.location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    {event.location}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Available Spots</p>
                  <p className="font-semibold text-gray-900">
                    {event.spotsRemaining} of {event.spotsAvailable} remaining
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
            </div>

            <div className="border-t pt-6">
              {!user ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Please log in to register for this event</p>
                  <button
                    onClick={() => router.push("/login")}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold transition"
                  >
                    Log In to Register
                  </button>
                </div>
              ) : event?.status === 'cancelled' ? (
                <div className="text-center">
                  <p className="text-gray-600">This event has been cancelled</p>
                </div>
              ) : isPastEvent ? (
                <div className="text-center">
                  <p className="text-gray-600">This event has already passed</p>
                </div>
              ) : event.spotsRemaining === 0 ? (
                <div className="text-center">
                  <p className="text-red-600 font-semibold">This event is full</p>
                </div>
              ) : isRegistered ? (
                <div className="text-center">
                  <p className="text-green-600 font-semibold mb-4">You are registered for this event</p>
                  <button
                    onClick={() => router.push("/my-schedule")}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-8 py-3 rounded-lg font-semibold transition"
                  >
                    View My Registrations
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <button
                    onClick={handleRegister}
                    disabled={registering}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {registering ? "Registering..." : "Register for This Event"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
