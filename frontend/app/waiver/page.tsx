"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function WaiverPage() {
  const { user, loading: authLoading, refreshWaiverStatus } = useAuth();
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // If user is not logged in, redirect to signup
    if (!authLoading && !user) {
      router.push("/signup");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreed) {
      setError("You must agree to the waiver to continue");
      return;
    }

    if (!user) {
      setError("You must be logged in to accept the waiver");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/volunteers/waiver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          displayName: user.displayName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit waiver");
      }

      // Refresh waiver status in auth context
      await refreshWaiverStatus();

      // Redirect to home page after successful waiver submission
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to submit waiver");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 px-6 py-8">
            <h1 className="text-2xl font-bold text-white text-center">
              Volunteer Waiver and Release Agreement
            </h1>
            <p className="text-white/70 text-center mt-1 text-sm">
              Inspired Hearts and Hands (IH2)
            </p>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border-l-4 border-blue-500 px-6 py-4">
            <h2 className="text-lg font-bold text-blue-900 mb-3">Volunteer-Friendly Summary</h2>
            <p className="text-blue-800 mb-3">
              Thank you for volunteering with Inspired Hearts and Hands (IH2). This waiver explains that:
            </p>
            <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm ml-2">
              <li>Volunteering is optional and involves some risk.</li>
              <li>You are responsible for yourself and for any guests or minor children you bring.</li>
              <li>IH2 is not responsible for injuries, illness, or property damage that may occur.</li>
              <li>You agree not to sue IH2 and to help protect IH2 if a claim arises from your actions.</li>
              <li>Photos or videos may be taken during activities and used to support IH2's mission.</li>
              <li>This agreement is legally binding when submitted electronically.</li>
            </ul>
            <p className="text-blue-900 font-semibold mt-3 text-sm">
              Please read the full agreement below before agreeing.
            </p>
          </div>

          {/* Full Waiver Text */}
          <div className="px-6 py-6 space-y-6 max-h-96 overflow-y-auto">
            <div className="text-gray-700 leading-relaxed space-y-4">
              <p className="font-semibold">
                By submitting this form electronically, I ("Volunteer"), on behalf of myself and any guests or minor children I bring with me, including any minor child(ren) for whom I am the parent or legal guardian, acknowledge and agree to the following:
              </p>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">1. Voluntary Participation</h3>
                <p>
                  I voluntarily desire to participate in volunteer activities with Inspired Hearts and Hands, Inc. ("IH2"). I understand participation may include physical activity, lifting, transportation, interaction with the public, and the use of facilities, equipment, and supplies.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">2. Assumption of Risk</h3>
                <p>
                  I knowingly and freely assume all risks, both known and unknown, even if arising from the negligence of IH2 or others, to the fullest extent permitted by Pennsylvania law.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">3. Release and Waiver of Liability</h3>
                <p>
                  I release and agree not to sue IH2 or its representatives for any claims arising from participation, whether caused by negligence or otherwise, to the fullest extent permitted by law.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">4. Indemnification</h3>
                <p>
                  I agree to indemnify and hold harmless IH2 from claims arising from my participation or the participation of any guest or minor child I bring.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">5. Responsibility for Guests and Minors</h3>
                <p>
                  I am solely responsible for supervising any guests or minor children I bring.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">6. Medical Care</h3>
                <p>
                  IH2 does not provide medical insurance or medical care for volunteers.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">7. Communicable Disease Acknowledgment</h3>
                <p>
                  I acknowledge the risk of exposure to communicable diseases and agree to comply with IH2 health policies.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">8. Photo, Video, and Media Release</h3>
                <p>
                  I grant IH2 permission to use photos, video, or audio recordings taken during activities for lawful purposes.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">9. Compliance with Rules</h3>
                <p>
                  I agree to follow all IH2 rules and instructions.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">10. Governing Law</h3>
                <p>
                  This agreement is governed by Pennsylvania law.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">11. Severability</h3>
                <p>
                  If any part is invalid, the remainder remains in effect.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">12. Electronic Acknowledgment</h3>
                <p>
                  Submission of this form constitutes my legal signature and agreement.
                </p>
              </div>
            </div>
          </div>

          {/* Agreement Form */}
          <form onSubmit={handleSubmit} className="border-t border-gray-200 px-6 py-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="mb-6 bg-amber-50 border border-amber-100 rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-5 w-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  required
                />
                <span className="text-gray-900 font-medium">
                  I have read and understand the Volunteer Waiver, Release of Liability, Assumption of Risk, Indemnification, and Media Release Agreement. By checking this box and clicking "I Agree" below, I electronically sign this agreement and acknowledge that it is legally binding.
                </span>
              </label>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={!agreed || submitting}
                className="flex-1 py-2.5 px-6 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "I Agree - Complete Registration"}
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              By clicking "I Agree", you confirm that you have read, understood, and agree to be bound by this waiver.
              <br />
              Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
