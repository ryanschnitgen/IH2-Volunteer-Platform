"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Helper function to get user-friendly error messages
function getAuthErrorMessage(error: any): string {
  const errorCode = error?.code || '';

  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead, or contact an administrator if you believe this is an error.';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 8 characters with a mix of letters and numbers';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection';
    case 'auth/popup-closed-by-user':
      return 'Sign-in cancelled';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for sign-in';
    default:
      return error?.message || 'Failed to create account';
  }
}

interface VolunteerGroup {
  _id: string;
  name: string;
  description: string;
}

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("USA");
  const [birthday, setBirthday] = useState("");
  const [canLiftHeavy, setCanLiftHeavy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Groups
  const [availableGroups, setAvailableGroups] = useState<VolunteerGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);

  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/groups").then(r => r.json()).then(d => setAvailableGroups(d.groups || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    if (password.length < 8) {
      return setError("Password must be at least 8 characters");
    }
    if (!firstName.trim()) return setError("First name is required");
    if (!lastName.trim()) return setError("Last name is required");

    setLoading(true);

    try {
      const displayName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ');

      // Sign up the user
      const userCredential = await signUp(email, password, displayName);

      // Create/update volunteer profile with additional information
      const profileRes = await fetch("/api/volunteers/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userCredential.user.uid,
          firstName: firstName.trim(),
          middleName: middleName.trim(),
          lastName: lastName.trim(),
          email,
          phone,
          address,
          city,
          state,
          zipCode,
          country,
          birthday: birthday || undefined,
          canLiftHeavy,
        }),
      });

      if (!profileRes.ok) {
        const profileData = await profileRes.json();
        throw new Error(profileData.error || "Failed to create profile");
      }

      // Join selected groups and/or create a new one
      if (selectedGroupIds.length > 0 || newGroupName.trim()) {
        await fetch("/api/groups/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            groupIds: selectedGroupIds,
            newGroupName: newGroupName.trim() || undefined,
          }),
        });
      }

      router.push("/waiver");
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      await signInWithGoogle();
      router.push("/waiver");
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="page-hero text-center">
        <div className="relative z-10 px-4">
          <p className="text-xs font-semibold text-primary-600 uppercase tracking-widest mb-3">Inspired Hearts and Hands</p>
          <h1 className="text-3xl font-bold text-gray-900">Join our volunteer community.</h1>
          <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-700">Sign in</Link>
          </p>
        </div>
      </div>

      <div className="flex justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            {error && (
              <div className="mb-5 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">First name <span className="text-red-500">*</span></label>
                  <input id="firstName" name="firstName" type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">Last name <span className="text-red-500">*</span></label>
                  <input id="lastName" name="lastName" type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)}
                    className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" />
                </div>
              </div>
              <div>
                <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-1.5">Middle name <span className="text-gray-400 font-normal">(optional)</span></label>
                <input id="middleName" name="middleName" type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)}
                  className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                <input id="phone" name="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  placeholder="(123) 456-7890" />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1.5">Street address <span className="text-gray-400 font-normal">(optional)</span></label>
                <input id="address" name="address" type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                  className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                  <input id="city" name="city" type="text" value={city} onChange={(e) => setCity(e.target.value)}
                    className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                  <input id="state" name="state" type="text" value={state} onChange={(e) => setState(e.target.value)}
                    className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                    placeholder="PA" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1.5">Zip code</label>
                  <input id="zipCode" name="zipCode" type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)}
                    className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" />
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                  <input id="country" name="country" type="text" value={country} onChange={(e) => setCountry(e.target.value)}
                    className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" />
                </div>
              </div>

              <div>
                <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-1.5">Birthday <span className="text-gray-400 font-normal">(optional)</span></label>
                <input id="birthday" name="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)}
                  className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input id="canLiftHeavy" name="canLiftHeavy" type="checkbox" checked={canLiftHeavy} onChange={(e) => setCanLiftHeavy(e.target.checked)}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                <span className="text-sm text-gray-700">I can lift heavy items (25+ lbs)</span>
              </label>

              {/* Groups */}
              <div className="pt-1 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Volunteer groups <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                {availableGroups.length > 0 && (
                  <div className="relative mb-3">
                    <button
                      type="button"
                      onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary-500 transition bg-white"
                    >
                      <span className={selectedGroupIds.length > 0 ? "text-gray-900" : "text-gray-400"}>
                        {selectedGroupIds.length > 0
                          ? `${selectedGroupIds.length} group${selectedGroupIds.length > 1 ? "s" : ""} selected`
                          : "Select groups to join"}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${showGroupDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showGroupDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                        {availableGroups.map(group => (
                          <label key={group._id} className="flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                            <input
                              type="checkbox"
                              checked={selectedGroupIds.includes(group._id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedGroupIds(prev => [...prev, group._id]);
                                } else {
                                  setSelectedGroupIds(prev => prev.filter(id => id !== group._id));
                                }
                              }}
                              className="h-4 w-4 mt-0.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 shrink-0"
                            />
                            <div>
                              <span className="text-sm text-gray-800 font-medium">{group.name}</span>
                              {group.description && (
                                <p className="text-xs text-gray-400">{group.description}</p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Don&apos;t see your group? Add it:
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="Group name"
                    className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div className="pt-1 border-t border-gray-100">
                <div className="grid grid-cols-1 gap-3 mt-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <input id="password" name="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)}
                      className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" />
                    <p className="mt-1 text-xs text-gray-400">At least 8 characters</p>
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                    <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <div className="mt-5">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                <div className="relative flex justify-center text-xs"><span className="px-3 bg-white text-gray-400">or continue with</span></div>
              </div>
              <button onClick={handleGoogleSignIn} disabled={loading}
                className="mt-4 w-full flex items-center justify-center gap-2.5 py-2.5 px-4 border border-gray-200 rounded-xl bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign up with Google
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
