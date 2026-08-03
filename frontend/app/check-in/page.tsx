"use client";

import { useState, useEffect } from "react";

interface KioskEvent {
  _id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
}

interface KioskRegistration {
  _id: string;
  userName: string;
  userEmail: string;
}

type Mode =
  | "loading"
  | "event-select"
  | "member-select"
  | "guest-question"
  | "manual"
  | "guest-count"
  | "success";

export default function VolunteerCheckIn() {
  const [mode, setMode] = useState<Mode>("loading");

  // Kiosk data
  const [todayEvents, setTodayEvents] = useState<KioskEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [registrations, setRegistrations] = useState<KioskRegistration[]>([]);
  const [selectedRegId, setSelectedRegId] = useState("");

  // Form fields (manual form or pre-filled from selection)
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [name, setName] = useState(""); // pre-filled from dropdown selection
  const [email, setEmail] = useState("");
  const [hasGuests, setHasGuests] = useState<boolean | null>(null);
  const [guestCount, setGuestCount] = useState(0);

  // Submission state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkedInEvents, setCheckedInEvents] = useState<string[]>([]);
  const [autoMatched, setAutoMatched] = useState(false);

  // Load today's events on mount and refresh at midnight
  useEffect(() => {
    loadTodayEvents();

    // Refresh at midnight so the list resets for the next day
    const now = new Date();
    const msUntilMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timer = setTimeout(() => {
      loadTodayEvents();
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, []);

  async function loadTodayEvents() {
    try {
      const res = await fetch("/api/check-ins/kiosk");
      const data = await res.json();
      const events: KioskEvent[] = data.events || [];
      setTodayEvents(events);
      setMode(events.length > 0 ? "event-select" : "manual");
    } catch {
      setMode("manual");
    }
  }

  async function handleEventSelect(eventId: string) {
    setSelectedEventId(eventId);
    setSelectedRegId("");
    setError("");
    if (!eventId) return;

    try {
      const res = await fetch(`/api/check-ins/kiosk?eventId=${eventId}`);
      const data = await res.json();
      setRegistrations(data.registrations || []);
      setMode("member-select");
    } catch {
      setRegistrations([]);
      setMode("member-select");
    }
  }

  function handleMemberSelect(regId: string) {
    setSelectedRegId(regId);
    const reg = registrations.find(r => r._id === regId);
    if (reg) {
      setName(reg.userName);
      setEmail(reg.userEmail);
    }
  }

  function proceedFromMemberSelect() {
    setError("");
    if (!selectedRegId) {
      setError("Please select your name, or click 'Not registered?'");
      return;
    }
    setHasGuests(null);
    setMode("guest-question");
  }

  function handleGuestQuestionSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (hasGuests === null) {
      setError("Please select whether you brought guests");
      return;
    }
    if (hasGuests) {
      setGuestCount(0);
      setMode("guest-count");
    } else {
      handleFinalSubmit();
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!firstName.trim()) { setError("Please enter your first name"); return; }
    if (!lastName.trim()) { setError("Please enter your last name"); return; }
    if (!email.trim()) { setError("Please enter your email"); return; }
    if (hasGuests === null) { setError("Please select whether you brought guests"); return; }
    const fullName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ');
    setName(fullName);
    if (hasGuests) {
      setGuestCount(0);
      setMode("guest-count");
    } else {
      handleFinalSubmit(fullName);
    }
  }

  function handleGuestCountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (guestCount < 1) { setError("Please enter at least 1 guest"); return; }
    const effectiveName = firstName.trim() && lastName.trim()
      ? [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ')
      : name;
    handleFinalSubmit(effectiveName);
  }

  async function handleFinalSubmit(nameOverride?: string) {
    setLoading(true);
    setError("");
    const effectiveName = nameOverride || name;

    try {
      const res = await fetch("/api/check-ins/volunteer-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: effectiveName.trim(),
          email: email.trim().toLowerCase(),
          hasGuests: hasGuests || false,
          guestCount: hasGuests ? guestCount : 0,
          timestamp: new Date().toISOString(),
          eventId: selectedEventId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit check-in");

      setCheckedInEvents(data.eventTitles || []);
      setAutoMatched(data.autoMatched || false);
      setName(effectiveName);
      setMode("success");

      // Reset after 5 seconds for next volunteer
      setTimeout(() => {
        setFirstName("");
        setMiddleName("");
        setLastName("");
        setName("");
        setEmail("");
        setHasGuests(null);
        setGuestCount(0);
        setSelectedEventId("");
        setSelectedRegId("");
        setRegistrations([]);
        setCheckedInEvents([]);
        setAutoMatched(false);
        setError("");
        setMode(todayEvents.length > 0 ? "event-select" : "manual");
      }, 5000);
    } catch (err: any) {
      setError(err.message || "Failed to submit check-in");
    } finally {
      setLoading(false);
    }
  }

  function goToManual() {
    setFirstName("");
    setLastName("");
    setName("");
    setEmail("");
    setHasGuests(null);
    setError("");
    setMode("manual");
  }

  function goBack() {
    setError("");
    if (mode === "member-select") setMode("event-select");
    else if (mode === "guest-question") setMode("member-select");
    else if (mode === "guest-count") {
      setMode(selectedRegId ? "guest-question" : "manual");
    } else if (mode === "manual") {
      setMode(todayEvents.length > 0 ? "event-select" : "manual");
    }
  }

  const selectedEvent = todayEvents.find(e => e._id === selectedEventId);

  // ── Success screen ──────────────────────────────────────────────────────────
  if (mode === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-lg text-gray-700 font-medium mb-3">{name}</p>

          {checkedInEvents.length > 0 ? (
            <div className="mb-4">
              {checkedInEvents.map((title, i) => (
                <p key={i} className="text-lg font-semibold text-primary-600">{title}</p>
              ))}
              {autoMatched && checkedInEvents.length === 1 && (
                <p className="text-sm text-gray-500 mt-1">Auto-matched to this event</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 mb-4">No active event found — your attendance was still recorded.</p>
          )}

          <p className="text-gray-600 text-lg mb-6">
            {hasGuests
              ? `Checked in: You + ${guestCount} guest${guestCount > 1 ? "s" : ""}`
              : "You've been checked in successfully"}
          </p>

          <p className="text-sm text-gray-400">Next volunteer can sign in in a moment…</p>
        </div>
      </div>
    );
  }

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (mode === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-lg w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs font-semibold text-primary-600 uppercase tracking-widest mb-2">
            Inspired Hearts and Hands
          </p>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Volunteer Sign In</h1>
          {selectedEvent && (
            <p className="text-sm text-gray-500 mt-1">
              {selectedEvent.title} · {selectedEvent.startTime}–{selectedEvent.endTime}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* ── Step: Event selection ── */}
        {mode === "event-select" && (
          <div className="space-y-5">
            <div>
              <label htmlFor="event-select" className="block text-sm font-medium text-gray-700 mb-1.5">
                Which event are you here for today?
              </label>
              <select
                id="event-select"
                value={selectedEventId}
                onChange={e => handleEventSelect(e.target.value)}
                className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white"
              >
                <option value="">Select an event…</option>
                {todayEvents.map(ev => (
                  <option key={ev._id} value={ev._id}>
                    {ev.title} ({ev.startTime}–{ev.endTime})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={goToManual}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition"
            >
              My event isn&apos;t listed — sign in manually
            </button>
          </div>
        )}

        {/* ── Step: Member selection ── */}
        {mode === "member-select" && (
          <div className="space-y-5">
            <div>
              <label htmlFor="member-select" className="block text-sm font-medium text-gray-700 mb-1.5">
                Select your name from the registered list
              </label>
              {registrations.length === 0 ? (
                <p className="text-sm text-gray-500 py-3">No registrations found for this event.</p>
              ) : (
                <select
                  id="member-select"
                  value={selectedRegId}
                  onChange={e => handleMemberSelect(e.target.value)}
                  className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white"
                >
                  <option value="">Select your name…</option>
                  {registrations.map(r => (
                    <option key={r._id} value={r._id}>
                      {r.userName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              type="button"
              onClick={proceedFromMemberSelect}
              disabled={!selectedRegId}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-base transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={goBack}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={goToManual}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition"
              >
                Not registered?
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Guest question (post-dropdown selection) ── */}
        {mode === "guest-question" && (
          <form onSubmit={handleGuestQuestionSubmit} className="space-y-5">
            <p className="text-lg font-semibold text-gray-900">Welcome, {name}!</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Did you bring guests who won&apos;t sign in separately?
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="hasGuests"
                    checked={hasGuests === true}
                    onChange={() => setHasGuests(true)}
                    className="w-5 h-5 text-primary-600"
                  />
                  <span className="text-base font-medium">Yes, I brought guests</span>
                </label>
                <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="hasGuests"
                    checked={hasGuests === false}
                    onChange={() => setHasGuests(false)}
                    className="w-5 h-5 text-primary-600"
                  />
                  <span className="text-base font-medium">No, just me</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={goBack}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold text-base transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-base transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in…" : hasGuests ? "Continue" : "Sign In"}
              </button>
            </div>
          </form>
        )}

        {/* ── Step: Manual form (walk-ins / no event listed) ── */}
        {mode === "manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">
                  First name <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  placeholder="First"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Last name <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  placeholder="Last"
                />
              </div>
            </div>
            <div>
              <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-1.5">
                Middle name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="middleName"
                type="text"
                value={middleName}
                onChange={e => setMiddleName(e.target.value)}
                className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="Middle"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Did you bring guests who won&apos;t sign in separately?
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="hasGuests"
                    checked={hasGuests === true}
                    onChange={() => setHasGuests(true)}
                    className="w-5 h-5 text-primary-600"
                  />
                  <span className="text-base font-medium">Yes, I brought guests</span>
                </label>
                <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="hasGuests"
                    checked={hasGuests === false}
                    onChange={() => setHasGuests(false)}
                    className="w-5 h-5 text-primary-600"
                  />
                  <span className="text-base font-medium">No, just me</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              {todayEvents.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setError(""); setMode("event-select"); }}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold text-base transition"
                >
                  ← Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-base transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in…" : hasGuests ? "Continue" : "Sign In"}
              </button>
            </div>
          </form>
        )}

        {/* ── Step: Guest count ── */}
        {mode === "guest-count" && (
          <form onSubmit={handleGuestCountSubmit} className="space-y-5">
            <div>
              <label htmlFor="guestCount" className="block text-sm font-medium text-gray-700 mb-1.5">
                How many guests did you bring?
              </label>
              <input
                id="guestCount"
                type="number"
                min="1"
                required
                value={guestCount || ""}
                onChange={e => setGuestCount(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="Number of guests"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                People with you who aren&apos;t signing in themselves
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={goBack}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold text-base transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-base transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">Inspired Hearts and Hands (IH2)</p>
        </div>
      </div>
    </div>
  );
}
