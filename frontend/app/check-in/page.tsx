"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VolunteerCheckInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [matchedEventTitle, setMatchedEventTitle] = useState("");
  const [autoMatched, setAutoMatched] = useState(false);

  // Form data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hasGuests, setHasGuests] = useState<boolean | null>(null);
  const [guestCount, setGuestCount] = useState(0);

  // Load event details if eventId is provided
  useEffect(() => {
    if (eventId) {
      fetch(`/api/events/${eventId}`)
        .then(res => res.json())
        .then(data => {
          if (data.event) {
            setEventTitle(data.event.title);
          }
        })
        .catch(err => console.error("Failed to load event:", err));
    }
  }, [eventId]);

  const handleSection1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    if (hasGuests === null) {
      setError("Please select whether you brought guests");
      return;
    }

    // If no guests, submit immediately
    if (hasGuests === false) {
      handleFinalSubmit();
    } else {
      // Go to section 2 to ask how many guests
      setStep(2);
    }
  };

  const handleSection2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (guestCount < 1) {
      setError("Please enter the number of guests (must be at least 1)");
      return;
    }

    handleFinalSubmit();
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/check-ins/volunteer-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          hasGuests: hasGuests || false,
          guestCount: hasGuests ? guestCount : 0,
          timestamp: new Date().toISOString(),
          eventId: eventId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit check-in");
      }

      // Capture the matched event info
      if (data.eventTitle) {
        setMatchedEventTitle(data.eventTitle);
      }
      if (data.autoMatched) {
        setAutoMatched(true);
      }

      setSuccess(true);

      // Reset form after 3 seconds
      setTimeout(() => {
        setName("");
        setEmail("");
        setHasGuests(null);
        setGuestCount(0);
        setStep(1);
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to submit check-in");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Thank You!</h2>
            {matchedEventTitle && (
              <p className="text-lg font-semibold text-primary-600 mb-2">
                {matchedEventTitle}
                {autoMatched && <span className="text-sm text-gray-500 block">Auto-matched to this event</span>}
              </p>
            )}
            <p className="text-gray-600 text-lg">
              {hasGuests
                ? `Checked in: You + ${guestCount} guest${guestCount > 1 ? 's' : ''}`
                : "You've been checked in successfully"}
            </p>
          </div>
          <p className="text-sm text-gray-500">
            You can close this page or sign in another volunteer
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Volunteer Sign In
          </h1>
          {eventTitle && (
            <p className="text-lg font-semibold text-primary-600 mb-2">
              {eventTitle}
            </p>
          )}
          <p className="text-gray-600">
            Section {step} of 2
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-primary-600' : 'bg-gray-200'}`} />
            <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`} />
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Section 1: Basic Info */}
        {step === 1 && (
          <form onSubmit={handleSection1Submit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                What is your name? *
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                What is your email? *
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Did you bring guests (kids, friends, etc) who won't sign in separately? *
              </label>
              <div className="space-y-3">
                <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="hasGuests"
                    value="yes"
                    checked={hasGuests === true}
                    onChange={() => setHasGuests(true)}
                    className="w-5 h-5 text-primary-600 mr-3"
                  />
                  <span className="text-lg font-medium">Yes</span>
                </label>

                <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="hasGuests"
                    value="no"
                    checked={hasGuests === false}
                    onChange={() => setHasGuests(false)}
                    className="w-5 h-5 text-primary-600 mr-3"
                  />
                  <span className="text-lg font-medium">No</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg font-bold text-lg hover:shadow-lg transform hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : "Continue"}
            </button>
          </form>
        )}

        {/* Section 2: Guest Count */}
        {step === 2 && (
          <form onSubmit={handleSection2Submit} className="space-y-6">
            <div>
              <label htmlFor="guestCount" className="block text-sm font-semibold text-gray-700 mb-2">
                How many guests did you bring? *
              </label>
              <input
                id="guestCount"
                type="number"
                min="1"
                required
                value={guestCount || ""}
                onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                placeholder="Enter number of guests"
              />
              <p className="text-sm text-gray-500 mt-2">
                This is the number of people with you who aren't signing in themselves
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-4 bg-gray-200 text-gray-800 rounded-lg font-bold text-lg hover:bg-gray-300 transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg font-bold text-lg hover:shadow-lg transform hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            Inspired Hearts and Hands (IH2)
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VolunteerCheckIn() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    }>
      <VolunteerCheckInForm />
    </Suspense>
  );
}
