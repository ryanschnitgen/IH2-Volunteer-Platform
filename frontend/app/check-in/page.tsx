"use client";

import { useState } from "react";

export default function VolunteerCheckIn() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkedInEvents, setCheckedInEvents] = useState<string[]>([]);
  const [autoMatched, setAutoMatched] = useState(false);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hasGuests, setHasGuests] = useState<boolean | null>(null);
  const [guestCount, setGuestCount] = useState(0);

  const handleSection1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (!email.trim()) { setError("Please enter your email"); return; }
    if (hasGuests === null) { setError("Please select whether you brought guests"); return; }
    if (hasGuests === false) {
      handleFinalSubmit();
    } else {
      setStep(2);
    }
  };

  const handleSection2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (guestCount < 1) { setError("Please enter the number of guests (must be at least 1)"); return; }
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit check-in");
      }

      setCheckedInEvents(data.eventTitles || []);
      setAutoMatched(data.autoMatched || false);
      setSuccess(true);

      // Auto-reset after 5 seconds so the next volunteer can sign in
      setTimeout(() => {
        setName("");
        setEmail("");
        setHasGuests(null);
        setGuestCount(0);
        setStep(1);
        setSuccess(false);
        setCheckedInEvents([]);
        setAutoMatched(false);
      }, 5000);
    } catch (err: any) {
      setError(err.message || "Failed to submit check-in");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Thank You!</h2>

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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-lg w-full">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold text-primary-600 uppercase tracking-widest mb-2">
            Inspired Hearts and Hands
          </p>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Volunteer Sign In</h1>
          <p className="text-gray-500 text-sm">Step {step} of {hasGuests ? "2" : "1"}</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          <div className="h-1.5 flex-1 rounded-full bg-primary-600" />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-primary-600" : "bg-gray-200"}`} />
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSection1Submit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Full name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="Your full name"
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
                onChange={(e) => setEmail(e.target.value)}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-base transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : hasGuests ? "Continue" : "Sign In"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSection2Submit} className="space-y-5">
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
                onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)}
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
                onClick={() => setStep(1)}
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
