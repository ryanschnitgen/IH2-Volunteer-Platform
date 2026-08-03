"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface VolunteerProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  birthday?: string;
  canLiftHeavy?: boolean;
  lifetimeHours: number;
}

interface VolunteerGroup {
  _id: string;
  name: string;
  description: string;
  memberEmails: string[];
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Groups
  const [allGroups, setAllGroups] = useState<VolunteerGroup[]>([]);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [showJoinDropdown, setShowJoinDropdown] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("");
  const [birthday, setBirthday] = useState("");
  const [canLiftHeavy, setCanLiftHeavy] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadProfile();
      fetch("/api/groups").then(r => r.json()).then(d => setAllGroups(d.groups || []));
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/volunteers/profile?userId=${user.uid}`);
      const data = await response.json();

      if (response.ok && data.profile) {
        setProfile(data.profile);
        populateForm(data.profile);
      } else {
        // No profile yet - create a basic one from Firebase user info
        const displayName = user.displayName || "";
        const nameParts = displayName.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (prof: VolunteerProfile) => {
    setFirstName(prof.firstName || "");
    setLastName(prof.lastName || "");
    setPhone(prof.phone || "");
    setAddress(prof.address || "");
    setCity(prof.city || "");
    setState(prof.state || "");
    setZipCode(prof.zipCode || "");
    setCountry(prof.country || "");
    setBirthday(prof.birthday ? new Date(prof.birthday).toISOString().split('T')[0] : "");
    setCanLiftHeavy(prof.canLiftHeavy || false);
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/volunteers/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          firstName,
          lastName,
          phone,
          address,
          city,
          state,
          zipCode,
          country,
          birthday: birthday || null,
          canLiftHeavy,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save profile");
      }

      setSuccess("Profile updated successfully!");
      setProfile(data.profile);
      setEditing(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      populateForm(profile);
    }
    setEditing(false);
    setError("");
  };

  const toggleGroup = async (groupId: string, isMember: boolean) => {
    if (!user?.email) return;
    setJoiningGroupId(groupId);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isMember ? "leave" : "join",
          userEmail: user.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAllGroups(prev => prev.map(g => g._id === groupId ? { ...g, memberEmails: data.group.memberEmails } : g));
      setShowJoinDropdown(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setJoiningGroupId(null);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="page-hero">
        <div className="relative z-10 container mx-auto px-4 max-w-4xl">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your contact info and preferences</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl py-8">
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl text-green-700 text-sm">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {profile && profile.lifetimeHours > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Imported Hours</p>
              <p className="text-3xl font-bold text-purple-600 tabular-nums">{profile.lifetimeHours.toFixed(1)}</p>
              <p className="text-sm text-gray-500 mt-1">from previous platform</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        )}

        {/* Profile Information Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-gray-900">Profile Information</h2>
            {!editing && (
              <button onClick={() => setEditing(true)} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                Edit
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user.email || ""}
                disabled
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {/* First Name */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={!editing}
                  className={`w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm ${
                    editing ? "focus:ring-2 focus:ring-primary-500 focus:border-transparent" : "bg-gray-50 text-gray-500"
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={!editing}
                  className={`w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm ${
                    editing ? "focus:ring-2 focus:ring-primary-500 focus:border-transparent" : "bg-gray-50 text-gray-500"
                  }`}
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!editing}
                className={`w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm ${
                  editing ? "focus:ring-2 focus:ring-primary-500 focus:border-transparent" : "bg-gray-50 text-gray-500"
                }`}
                placeholder="(123) 456-7890"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!editing}
                className={`w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm ${
                  editing ? "focus:ring-2 focus:ring-primary-500 focus:border-transparent" : "bg-gray-50 text-gray-500"
                }`}
                placeholder="123 Main St"
              />
            </div>

            {/* City, State, Zip */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!editing}
                  className={`w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm ${
                    editing ? "focus:ring-2 focus:ring-primary-500 focus:border-transparent" : "bg-gray-50 text-gray-500"
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={!editing}
                  className={`w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm ${
                    editing ? "focus:ring-2 focus:ring-primary-500 focus:border-transparent" : "bg-gray-50 text-gray-500"
                  }`}
                  placeholder="PA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zip Code
                </label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  disabled={!editing}
                  className={`w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm ${
                    editing ? "focus:ring-2 focus:ring-primary-500 focus:border-transparent" : "bg-gray-50 text-gray-500"
                  }`}
                />
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={!editing}
                className={`w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm ${
                  editing ? "focus:ring-2 focus:ring-primary-500 focus:border-transparent" : "bg-gray-50 text-gray-500"
                }`}
                placeholder="USA"
              />
            </div>

            {/* Birthday */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Birthday
              </label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                disabled={!editing}
                className={`w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm ${
                  editing ? "focus:ring-2 focus:ring-primary-500 focus:border-transparent" : "bg-gray-50 text-gray-500"
                }`}
              />
            </div>

            {/* Can Lift Heavy */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canLiftHeavy}
                  onChange={(e) => setCanLiftHeavy(e.target.checked)}
                  disabled={!editing}
                  className="w-5 h-5 text-primary-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  Able to lift heavy items
                </span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          {editing && (
            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
              <button onClick={handleSave} disabled={saving || !firstName.trim() || !lastName.trim()}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={handleCancel} disabled={saving}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-semibold transition">
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Groups */}
        {allGroups.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">My Groups</h2>
              <div className="relative">
                <button
                  onClick={() => setShowJoinDropdown(!showJoinDropdown)}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition"
                >
                  Join a Group
                </button>
                {showJoinDropdown && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 z-10 overflow-hidden">
                    {allGroups.map(group => {
                      const isMember = group.memberEmails.includes((user?.email || "").toLowerCase());
                      return (
                        <button
                          key={group._id}
                          onClick={() => toggleGroup(group._id, isMember)}
                          disabled={joiningGroupId === group._id}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">{group.name}</p>
                            {group.description && <p className="text-xs text-gray-400">{group.description}</p>}
                          </div>
                          {isMember ? (
                            <span className="text-xs text-green-600 font-semibold ml-3 shrink-0">✓ Joined</span>
                          ) : (
                            <span className="text-xs text-primary-600 font-semibold ml-3 shrink-0">Join</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {(() => {
              const myGroups = allGroups.filter(g => g.memberEmails.includes((user?.email || "").toLowerCase()));
              return myGroups.length === 0 ? (
                <p className="text-sm text-gray-400">You haven&apos;t joined any groups yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {myGroups.map(g => (
                    <div key={g._id} className="flex items-center gap-1.5 bg-primary-50 text-primary-700 rounded-full px-3 py-1.5 text-sm font-medium">
                      {g.name}
                      <button
                        onClick={() => toggleGroup(g._id, true)}
                        disabled={joiningGroupId === g._id}
                        className="text-primary-400 hover:text-primary-700 ml-1 leading-none"
                        title="Leave group"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-3">
          <Link href="/volunteer-hours" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-gray-200 hover:shadow-md transition-all group flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-gray-900">Hours Report</p>
              <p className="text-xs text-gray-400 mt-0.5">View &amp; print your history</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="/opportunities" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-gray-200 hover:shadow-md transition-all group flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-gray-900">Opportunities</p>
              <p className="text-xs text-gray-400 mt-0.5">Browse upcoming events</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="/my-schedule" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-gray-200 hover:shadow-md transition-all group flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-gray-900">My Schedule</p>
              <p className="text-xs text-gray-400 mt-0.5">Upcoming commitments</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
