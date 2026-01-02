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

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your volunteer profile and settings</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Stats Card */}
        {profile && profile.lifetimeHours > 0 && (
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-lg shadow-lg p-6 mb-8">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Imported Lifetime Hours</h3>
            <p className="text-5xl font-bold">{profile.lifetimeHours.toFixed(2)}</p>
            <p className="text-sm opacity-80 mt-2">From previous platform</p>
          </div>
        )}

        {/* Profile Information Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition font-semibold"
              >
                Edit Profile
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
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
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    editing ? "focus:ring-2 focus:ring-primary-500" : "bg-gray-50 text-gray-500"
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
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    editing ? "focus:ring-2 focus:ring-primary-500" : "bg-gray-50 text-gray-500"
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
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                  editing ? "focus:ring-2 focus:ring-primary-500" : "bg-gray-50 text-gray-500"
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
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                  editing ? "focus:ring-2 focus:ring-primary-500" : "bg-gray-50 text-gray-500"
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
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    editing ? "focus:ring-2 focus:ring-primary-500" : "bg-gray-50 text-gray-500"
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
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    editing ? "focus:ring-2 focus:ring-primary-500" : "bg-gray-50 text-gray-500"
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
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    editing ? "focus:ring-2 focus:ring-primary-500" : "bg-gray-50 text-gray-500"
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
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                  editing ? "focus:ring-2 focus:ring-primary-500" : "bg-gray-50 text-gray-500"
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
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                  editing ? "focus:ring-2 focus:ring-primary-500" : "bg-gray-50 text-gray-500"
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
            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving || !firstName.trim() || !lastName.trim()}
                className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Links</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/volunteer-hours"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <h3 className="font-semibold text-gray-900 mb-1">My Hours</h3>
              <p className="text-sm text-gray-600">View your volunteer hours and history</p>
            </Link>
            <Link
              href="/opportunities"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <h3 className="font-semibold text-gray-900 mb-1">Find Opportunities</h3>
              <p className="text-sm text-gray-600">Browse and register for events</p>
            </Link>
            <Link
              href="/my-schedule"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <h3 className="font-semibold text-gray-900 mb-1">My Schedule</h3>
              <p className="text-sm text-gray-600">View your upcoming events</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
