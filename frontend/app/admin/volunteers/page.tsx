"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { isAdmin } from "@backend/lib/admin";
import ConfirmModal from "@/components/ConfirmModal";

interface VolunteerProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  birthday?: string;
  volunteerDateJoined?: string;
  canLiftHeavy?: boolean;
  lifetimeHours: number;
  linkedUserId?: string;
  importedAt: string;
  isAdmin?: boolean;
  userCreatedAt?: string;
}

export default function AdminVolunteersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [volunteers, setVolunteers] = useState<VolunteerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerProfile | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [hoursLogs, setHoursLogs] = useState<any[]>([]);
  const [editingHourId, setEditingHourId] = useState<string | null>(null);
  const [editHoursValue, setEditHoursValue] = useState<number>(0);
  const [deletingHourId, setDeletingHourId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [volunteerToDelete, setVolunteerToDelete] = useState<VolunteerProfile | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [volunteerHourTotals, setVolunteerHourTotals] = useState<Record<string, { approved: number; pending: number }>>({});
  const [approvingHourId, setApprovingHourId] = useState<string | null>(null);

  // Confirm modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ title: "", message: "", onConfirm: () => {} });

  // Super admins who can assign admin privileges
  const SUPER_ADMINS = [
    "rschnitgen@zoominternet.net",
    "info@inspiredheartsandhands.com"
  ];

  const isSuperAdmin = (email: string) => {
    return SUPER_ADMINS.includes(email.toLowerCase());
  };

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin(user.email))) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && isAdmin(user.email)) {
      loadVolunteers();
    }
  }, [user]);

  const loadVolunteers = async () => {
    try {
      setLoading(true);

      // Fetch both volunteers and users
      const [volunteersRes, usersRes] = await Promise.all([
        fetch(`/api/volunteers?adminEmail=${encodeURIComponent(user?.email || '')}`),
        fetch(`/api/admin/users?adminEmail=${encodeURIComponent(user?.email || '')}`),
      ]);

      const volunteersData = await volunteersRes.json();
      const usersData = await usersRes.json();

      if (!volunteersRes.ok) {
        throw new Error(volunteersData.error || "Failed to load volunteers");
      }

      // Create a map of volunteer profiles by email
      const volunteerMap = new Map();
      volunteersData.volunteers.forEach((vol: VolunteerProfile) => {
        volunteerMap.set(vol.email.toLowerCase(), vol);
      });

      // Merge user data into volunteer profiles
      const mergedList: VolunteerProfile[] = [];

      // First, add all volunteer profiles with user data if they have accounts
      volunteersData.volunteers.forEach((vol: VolunteerProfile) => {
        if (vol.linkedUserId) {
          const userAccount = usersData.users?.find((u: any) => u.firebaseUid === vol.linkedUserId);
          if (userAccount) {
            mergedList.push({
              ...vol,
              isAdmin: userAccount.isAdmin,
              userCreatedAt: userAccount.createdAt,
            });
          } else {
            mergedList.push(vol);
          }
        } else {
          mergedList.push(vol);
        }
      });

      // Then, add any users who signed up but don't have volunteer profiles
      usersData.users?.forEach((user: any) => {
        const existingProfile = volunteerMap.get(user.email.toLowerCase());
        if (!existingProfile) {
          // User signed up but no imported profile exists - create a profile entry
          mergedList.push({
            _id: user._id,
            firstName: user.displayName?.split(' ')[0] || 'Unknown',
            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
            email: user.email,
            lifetimeHours: 0,
            linkedUserId: user.firebaseUid,
            importedAt: user.createdAt,
            isAdmin: user.isAdmin,
            userCreatedAt: user.createdAt,
          });
        }
      });

      setVolunteers(mergedList);

      // Load platform hours totals (approved + pending) per volunteer
      try {
        const totalsRes = await fetch(`/api/hours/volunteer-totals?adminEmail=${encodeURIComponent(user?.email || '')}`);
        const totalsData = await totalsRes.json();
        if (totalsRes.ok) setVolunteerHourTotals(totalsData.totals || {});
      } catch {
        // Non-fatal — list still works without totals
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (volunteer: VolunteerProfile) => {
    if (!volunteer.linkedUserId) return;

    try {
      setUpdatingUserId(volunteer.linkedUserId);

      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: volunteer.linkedUserId,
          isAdmin: !volunteer.isAdmin,
          adminEmail: user?.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update user");
      }

      // Reload volunteers to get updated admin status
      await loadVolunteers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteAccount = (volunteer: VolunteerProfile) => {
    setVolunteerToDelete(volunteer);
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    if (!volunteerToDelete || !user) return;

    try {
      setDeletingAccount(true);
      setError("");

      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: volunteerToDelete.linkedUserId,
          email: volunteerToDelete.email,
          requestingUserEmail: user.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      // Close modals and reload
      setShowDeleteModal(false);
      setShowDetailModal(false);
      setVolunteerToDelete(null);
      await loadVolunteers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingAccount(false);
    }
  };

  const filteredVolunteers = volunteers.filter((v) => {
    // Search filter
    const search = searchTerm.toLowerCase();
    const fullName = `${v.firstName} ${v.lastName}`.toLowerCase();
    const matchesSearch = !search || (
      v.firstName.toLowerCase().includes(search) ||
      v.lastName.toLowerCase().includes(search) ||
      fullName.includes(search) ||
      v.email.toLowerCase().includes(search) ||
      v.phone?.includes(search) ||
      v.city?.toLowerCase().includes(search)
    );

    // Activity status filter (active = has account, inactive = no account)
    const matchesStatus = filterStatus === "all" ||
      (filterStatus === "active" && v.linkedUserId) ||
      (filterStatus === "inactive" && !v.linkedUserId);

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const formatFullAddress = (volunteer: VolunteerProfile) => {
    const parts = [
      volunteer.address,
      volunteer.city,
      volunteer.state,
      volunteer.zipCode,
      volunteer.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "No address on file";
  };

  const viewDetails = async (volunteer: VolunteerProfile) => {
    setSelectedVolunteer(volunteer);
    setHoursLogs([]);
    setShowDetailModal(true);
    if (volunteer.linkedUserId) {
      await loadHoursLogs(volunteer.linkedUserId);
    }
  };

  const loadHoursLogs = async (userId: string) => {
    try {
      const response = await fetch(`/api/hours?userId=${userId}`);
      if (!response.ok) return;
      const data = await response.json();
      setHoursLogs(data.hoursLogs || []);
    } catch (error) {
      console.error("Error loading hours logs:", error);
    }
  };

  const approveHoursLog = async (hoursLogId: string, hours?: number) => {
    setApprovingHourId(hoursLogId);
    try {
      const response = await fetch("/api/hours/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hoursLogId, approved: true, hours, adminEmail: user?.email }),
      });
      if (response.ok && selectedVolunteer?.linkedUserId) {
        await loadHoursLogs(selectedVolunteer.linkedUserId);
        await loadVolunteers();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to approve hours");
        setTimeout(() => setError(""), 3000);
      }
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setApprovingHourId(null);
    }
  };

  const rejectHoursLog = async (hoursLogId: string) => {
    setApprovingHourId(hoursLogId);
    try {
      const response = await fetch("/api/hours/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hoursLogId, approved: false, adminEmail: user?.email }),
      });
      if (response.ok && selectedVolunteer?.linkedUserId) {
        await loadHoursLogs(selectedVolunteer.linkedUserId);
        await loadVolunteers();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to reject hours");
        setTimeout(() => setError(""), 3000);
      }
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setApprovingHourId(null);
    }
  };

  const startEditHours = (hoursLog: any) => {
    setEditingHourId(hoursLog._id);
    setEditHoursValue(hoursLog.hours);
  };

  const saveEditHours = async () => {
    if (!editingHourId) return;

    try {
      const response = await fetch("/api/hours", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hoursLogId: editingHourId,
          hours: editHoursValue,
          adminEmail: user?.email,
        }),
      });

      if (response.ok && selectedVolunteer?.linkedUserId) {
        await loadHoursLogs(selectedVolunteer.linkedUserId);
        await loadVolunteers();
        setEditingHourId(null);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save hours");
        setTimeout(() => setError(""), 3000);
      }
    } catch (error: any) {
      setError(error.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  const deleteHoursLog = async (hoursLogId: string, eventTitle?: string) => {
    // Show custom confirmation modal
    setConfirmModalData({
      title: "Delete Hours Entry",
      message: `Delete this hours entry${eventTitle ? ` for "${eventTitle}"` : ""}? This cannot be undone.`,
      onConfirm: async () => {
        setShowConfirmModal(false);
        await executeDeleteHoursLog(hoursLogId);
      }
    });
    setShowConfirmModal(true);
  };

  const executeDeleteHoursLog = async (hoursLogId: string) => {
    setDeletingHourId(hoursLogId);
    try {
      const response = await fetch(`/api/hours?id=${hoursLogId}&adminEmail=${encodeURIComponent(user?.email || '')}`, {
        method: "DELETE",
      });

      if (response.ok && selectedVolunteer?.linkedUserId) {
        await loadHoursLogs(selectedVolunteer.linkedUserId);
        await loadVolunteers();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete hours entry");
        setTimeout(() => setError(""), 3000);
      }
    } catch (error: any) {
      setError(error.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setDeletingHourId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user || !isAdmin(user.email)) {
    return null;
  }

  const handleExportCSV = () => {
    window.open(`/api/admin/export-csv?adminEmail=${encodeURIComponent(user?.email || '')}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Volunteer Directory
            </h1>
            <p className="text-gray-600">
              View and manage all volunteer profiles ({volunteers.length} total)
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to CSV
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Search & Filters</h3>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Name, email, phone, city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Volunteers</option>
                <option value="active">Active (Has Account)</option>
                <option value="inactive">Inactive (No Account)</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(searchTerm || filterStatus !== "all") && (
              <div className="md:col-span-2">
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("all");
                  }}
                  className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredVolunteers.length} of {volunteers.length} volunteers
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 font-semibold">Total Volunteers</p>
            <p className="text-3xl font-bold text-primary-600">{volunteers.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 font-semibold">With Accounts</p>
            <p className="text-3xl font-bold text-green-600">
              {volunteers.filter((v) => v.linkedUserId).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 font-semibold">Can Lift Heavy</p>
            <p className="text-3xl font-bold text-blue-600">
              {volunteers.filter((v) => v.canLiftHeavy).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 font-semibold">Imported Hours</p>
            <p className="text-3xl font-bold text-purple-600">
              {volunteers.reduce((sum, v) => sum + (v.lifetimeHours || 0), 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">Legacy system hours</p>
          </div>
        </div>

        {/* Volunteers Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    City
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Platform Hrs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVolunteers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? "No volunteers found matching your search" : "No volunteers yet"}
                    </td>
                  </tr>
                ) : (
                  filteredVolunteers.map((volunteer) => (
                    <tr key={volunteer._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {volunteer.firstName} {volunteer.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{volunteer.email || "-"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{volunteer.username || "-"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {volunteer.phone || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {volunteer.city || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {volunteer.linkedUserId ? (
                          <div>
                            <div className="text-sm font-semibold text-blue-600">
                              {(volunteerHourTotals[volunteer.linkedUserId]?.approved || 0).toFixed(1)} hrs
                            </div>
                            {(volunteerHourTotals[volunteer.linkedUserId]?.pending || 0) > 0 && (
                              <div className="text-xs text-amber-600">
                                +{(volunteerHourTotals[volunteer.linkedUserId]?.pending || 0).toFixed(1)} pending
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">—</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {volunteer.linkedUserId ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Not Registered
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {volunteer.linkedUserId ? (
                          volunteer.isAdmin ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                              Admin
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              Volunteer
                            </span>
                          )
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => viewDetails(volunteer)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded font-semibold text-sm transition"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedVolunteer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedVolunteer.firstName} {selectedVolunteer.lastName}
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Contact Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <span className="ml-2 text-gray-600">{selectedVolunteer.email}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Phone:</span>
                    <span className="ml-2 text-gray-600">{selectedVolunteer.phone || "Not provided"}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Address:</span>
                    <span className="ml-2 text-gray-600">{formatFullAddress(selectedVolunteer)}</span>
                  </div>
                </div>
              </div>

              {/* Volunteer Information */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Volunteer Information</h3>
                <div className="space-y-2 text-sm">
                  <div className={`${selectedVolunteer.lifetimeHours > 0 ? 'bg-purple-100 -mx-4 -mt-4 p-4 mb-3 rounded-t-lg' : ''}`}>
                    <span className="font-medium text-gray-700">Imported Hours:</span>
                    <span className="ml-2 text-purple-600 font-bold text-lg">{(selectedVolunteer.lifetimeHours || 0).toFixed(2)} hours</span>
                    {selectedVolunteer.lifetimeHours > 0 && (
                      <p className="text-xs text-purple-700 mt-1">✓ Imported from previous platform</p>
                    )}
                  </div>
                  {selectedVolunteer.linkedUserId && (
                    <>
                      <div>
                        <span className="font-medium text-gray-700">Platform Hours:</span>
                        <span className="ml-2 text-blue-600 font-semibold">
                          {hoursLogs.filter(l => !l.pendingApproval).reduce((sum: number, log: any) => sum + log.hours, 0).toFixed(2)} hrs
                        </span>
                        <span className="ml-1 text-xs text-gray-500">(approved)</span>
                      </div>
                      {hoursLogs.some(l => l.pendingApproval) && (
                        <div>
                          <span className="font-medium text-amber-700">Pending Approval:</span>
                          <span className="ml-2 text-amber-600 font-semibold">
                            {hoursLogs.filter(l => l.pendingApproval).reduce((sum: number, log: any) => sum + log.hours, 0).toFixed(2)} hrs
                          </span>
                        </div>
                      )}
                      <div className="border-t border-blue-200 pt-2 mt-1">
                        <span className="font-medium text-gray-700">Total Hours:</span>
                        <span className="ml-2 text-green-600 font-bold text-lg">
                          {((selectedVolunteer.lifetimeHours || 0) + hoursLogs.filter(l => !l.pendingApproval).reduce((sum: number, log: any) => sum + log.hours, 0)).toFixed(2)} hrs
                        </span>
                        <span className="ml-1 text-xs text-gray-400">(imported + approved)</span>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="font-medium text-gray-700">Date Joined:</span>
                    <span className="ml-2 text-gray-600">{formatDate(selectedVolunteer.volunteerDateJoined)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Birthday:</span>
                    <span className="ml-2 text-gray-600">{formatDate(selectedVolunteer.birthday)}</span>
                  </div>
                  {selectedVolunteer.canLiftHeavy !== undefined && (
                    <div>
                      <span className="font-medium text-gray-700">Can Lift Heavy Items:</span>
                      <span className="ml-2 text-gray-600">{selectedVolunteer.canLiftHeavy ? "Yes" : "No"}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Status */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Account Status</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Portal Account:</span>
                    <span className="ml-2">
                      {selectedVolunteer.linkedUserId ? (
                        <span className="text-green-700 font-semibold">✓ Registered</span>
                      ) : (
                        <span className="text-gray-600">Not yet registered</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Profile Imported:</span>
                    <span className="ml-2 text-gray-600">{formatDate(selectedVolunteer.importedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hours History */}
            {selectedVolunteer.linkedUserId && hoursLogs.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Hours History</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Event/Activity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {hoursLogs.map((log: any) => (
                        <tr key={log._id} className={log.pendingApproval ? "bg-amber-50" : ""}>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatDate(log.date)}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{log.eventTitle || log.notes || "Manual Entry"}</td>
                          <td className="px-4 py-2 text-sm">
                            {editingHourId === log._id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0.5"
                                  value={editHoursValue}
                                  onChange={(e) => setEditHoursValue(parseFloat(e.target.value))}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <button
                                  onClick={saveEditHours}
                                  className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingHourId(null)}
                                  className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span className={`font-semibold ${log.pendingApproval ? "text-amber-600" : "text-purple-600"}`}>
                                {log.hours.toFixed(2)} hrs
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {log.pendingApproval ? (
                              <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">Pending</span>
                            ) : log.autoAssigned ? (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Event</span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Manual</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {log.pendingApproval ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => approveHoursLog(log._id)}
                                  disabled={approvingHourId === log._id}
                                  className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                                >
                                  {approvingHourId === log._id ? "..." : "Approve"}
                                </button>
                                <button
                                  onClick={() => rejectHoursLog(log._id)}
                                  disabled={approvingHourId === log._id}
                                  className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : editingHourId !== log._id ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => startEditHours(log)}
                                  className="px-2 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteHoursLog(log._id, log.eventTitle)}
                                  disabled={deletingHourId === log._id}
                                  className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                                >
                                  {deletingHourId === log._id ? "..." : "Delete"}
                                </button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-between items-center">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    router.push(`/admin/email?recipient=${encodeURIComponent(JSON.stringify({ email: selectedVolunteer.email, name: `${selectedVolunteer.firstName} ${selectedVolunteer.lastName}` }))}`);
                  }}
                  className="px-6 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg font-semibold transition"
                >
                  Send Email
                </button>
                {user && user.email && isSuperAdmin(user.email) && selectedVolunteer.linkedUserId && selectedVolunteer.email !== user?.email && (
                  <>
                    <button
                      onClick={() => {
                        toggleAdminStatus(selectedVolunteer);
                        setShowDetailModal(false);
                      }}
                      disabled={updatingUserId === selectedVolunteer.linkedUserId}
                      className={`px-6 py-2 rounded-lg font-semibold transition ${
                        selectedVolunteer.isAdmin
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                      } ${updatingUserId === selectedVolunteer.linkedUserId ? "opacity-50" : ""}`}
                    >
                      {updatingUserId === selectedVolunteer.linkedUserId
                        ? "Updating..."
                        : selectedVolunteer.isAdmin
                        ? "🔻 Revoke Admin"
                        : "⬆️ Grant Admin"}
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(selectedVolunteer)}
                      className="px-6 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-semibold transition"
                    >
                      Delete Account
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && volunteerToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Account</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to permanently delete the account for <strong>{volunteerToDelete.firstName} {volunteerToDelete.lastName}</strong> ({volunteerToDelete.email})?
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This will delete:
              </p>
              <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
                <li>Their user account and authentication</li>
                <li>All event registrations</li>
                <li>All volunteer hour records</li>
                <li>Their volunteer profile</li>
              </ul>
              <p className="text-sm text-red-800 mt-2">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setVolunteerToDelete(null);
                }}
                disabled={deletingAccount}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAccount}
                disabled={deletingAccount}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {deletingAccount ? "Deleting..." : "Delete Account"}
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
