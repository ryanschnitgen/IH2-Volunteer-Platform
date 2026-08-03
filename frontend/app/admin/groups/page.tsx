"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { isAdmin } from "@backend/lib/admin";

interface VolunteerGroup {
  _id: string;
  name: string;
  description: string;
  memberEmails: string[];
  createdBy: string;
  createdAt: string;
}

export default function AdminGroupsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<VolunteerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create form
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Expanded group & member management
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin(user.email))) router.push("/");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && isAdmin(user.email)) loadGroups();
  }, [user]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/groups");
      const data = await res.json();
      setGroups(data.groups || []);
    } catch {
      setError("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDesc.trim(),
          adminEmail: user?.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGroups([...groups, data.group]);
      setNewGroupName("");
      setNewGroupDesc("");
      flash("Group created");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("Delete this group?")) return;
    try {
      const res = await fetch(`/api/groups/${id}?adminEmail=${encodeURIComponent(user?.email || "")}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setGroups(groups.filter(g => g._id !== id));
      if (expandedId === id) setExpandedId(null);
      flash("Group deleted");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const addMember = async (groupId: string) => {
    if (!addMemberEmail.trim()) return;
    setAddingMember(true);
    setError("");
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add-member", email: addMemberEmail.trim(), adminEmail: user?.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGroups(groups.map(g => g._id === groupId ? { ...g, memberEmails: data.group.memberEmails } : g));
      setAddMemberEmail("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const removeMember = async (groupId: string, email: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove-member", email, adminEmail: user?.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGroups(groups.map(g => g._id === groupId ? { ...g, memberEmails: data.group.memberEmails } : g));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!user || !isAdmin(user.email)) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="page-hero">
        <div className="relative z-10 container mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900">Volunteer Groups</h1>
          <p className="text-gray-500 text-sm mt-0.5">Create and manage volunteer groups</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
        {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>}

        {/* Create Group */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Create New Group</h2>
          <form onSubmit={createGroup} className="space-y-3">
            <input
              type="text"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="Group name"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
            <input
              type="text"
              value={newGroupDesc}
              onChange={e => setNewGroupDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="submit"
              disabled={creating || !newGroupName.trim()}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Group"}
            </button>
          </form>
        </div>

        {/* Groups List */}
        <div className="space-y-4">
          {groups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400 text-sm">
              No groups yet. Create one above.
            </div>
          ) : (
            groups.map(group => (
              <div key={group._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Group header */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpandedId(expandedId === group._id ? null : group._id)}
                >
                  <div>
                    <h3 className="font-bold text-gray-900">{group.name}</h3>
                    {group.description && <p className="text-sm text-gray-500 mt-0.5">{group.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">{group.memberEmails.length} member{group.memberEmails.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={e => { e.stopPropagation(); deleteGroup(group._id); }}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition"
                    >
                      Delete
                    </button>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedId === group._id ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded member management */}
                {expandedId === group._id && (
                  <div className="border-t border-gray-100 p-5">
                    {/* Add member */}
                    <div className="flex gap-3 mb-4">
                      <input
                        type="email"
                        value={addMemberEmail}
                        onChange={e => setAddMemberEmail(e.target.value)}
                        placeholder="volunteer@email.com"
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        onKeyDown={e => e.key === "Enter" && addMember(group._id)}
                      />
                      <button
                        onClick={() => addMember(group._id)}
                        disabled={addingMember || !addMemberEmail.trim()}
                        className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50"
                      >
                        {addingMember ? "Adding..." : "Add Member"}
                      </button>
                    </div>

                    {/* Member list */}
                    {group.memberEmails.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No members yet</p>
                    ) : (
                      <ul className="space-y-2">
                        {group.memberEmails.map(email => (
                          <li key={email} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                            <span className="text-sm text-gray-700">{email}</span>
                            <button
                              onClick={() => removeMember(group._id, email)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium transition"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
