"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { isAdmin } from "@backend/lib/admin";
import { formatTime } from "@/lib/formatTime";
import { EVENT_TYPES, getCategoryForEventType } from "@/constants/eventTypes";
import ConfirmModal from "@/components/ConfirmModal";

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
  createdBy: string;
  createdByName: string;
  organization: string;
  eventType: string;
  eventCategory: string;
  status: "active" | "cancelled" | "completed";
}

interface EventFormData {
  title: string;
  description: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  spotsAvailable: number;
  organization: string;
  eventType: string;
  eventCategory: string;
}

export default function AdminEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    location: "20 Leonberg Road, Building E Cranberry Township, PA 16066",
    date: "",
    startTime: "",
    endTime: "",
    spotsAvailable: 10,
    organization: "IH2",
    eventType: "",
    eventCategory: "",
  });

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToCancel, setEventToCancel] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [sendCancellationEmail, setSendCancellationEmail] = useState(true);
  const [sendingNotification, setSendingNotification] = useState(false);

  // Registrations modal
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [selectedEventForRegistrations, setSelectedEventForRegistrations] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [assigningHours, setAssigningHours] = useState<string | null>(null);

  // Event type selection
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [eventFilter, setEventFilter] = useState<"active" | "past">("active");
  const [pastEventsToShow, setPastEventsToShow] = useState(5);
  const [searchDate, setSearchDate] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [addUserEmail, setAddUserEmail] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [showAddGroupForm, setShowAddGroupForm] = useState(false);
  const [addGroupName, setAddGroupName] = useState("");
  const [addGroupSize, setAddGroupSize] = useState(2);
  const [addingGroup, setAddingGroup] = useState(false);

  // Confirm modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ title: "", message: "", onConfirm: () => {} });

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin(user.email))) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && isAdmin(user.email)) {
      loadEvents();
    }
  }, [user]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/events");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load events");
      }

      setEvents(data.events);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getGoogleMapsUrl = (location: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Inspired Hearts and Hands ${location}`)}`;
  };

  const viewRegistrations = async (event: Event) => {
    setSelectedEventForRegistrations(event);
    setShowRegistrationsModal(true);
    setRegistrations([]);
    setLoadingRegistrations(true);

    try {
      // Add cache busting to ensure fresh data
      const response = await fetch(`/api/events/registrations/all?adminEmail=${encodeURIComponent(user?.email || '')}&t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await response.json();

      if (response.ok) {
        const eventRegistrations = data.registrations.filter(
          (r: any) => r.eventId === event._id
        );
        setRegistrations(eventRegistrations);
      }
    } catch (err) {
      console.error("Error loading registrations:", err);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const toggleAttendance = async (registrationId: string, currentStatus: boolean) => {
    try {
      const response = await fetch("/api/events/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId,
          attended: !currentStatus,
          adminEmail: user?.email,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update attendance");
      }

      // Update local state
      setRegistrations(registrations.map(r =>
        r._id === registrationId ? { ...r, attended: !currentStatus } : r
      ));
    } catch (err) {
      console.error("Error updating attendance:", err);
      setError("Failed to update attendance. Please try again.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const assignHoursToAttendees = async () => {
    if (!selectedEventForRegistrations) return;

    const attendedCount = registrations.filter(r => (r.attended || r.checkedIn) && !r.cancelled).length;
    const noShowCount = registrations.filter(r => r.attended === false && !r.checkedIn && !r.cancelled).length;
    const alreadyAssignedCount = registrations.filter(r => r.hoursCompleted > 0 && !r.cancelled).length;
    const needsAssignmentCount = attendedCount - alreadyAssignedCount;

    let confirmMessage = "";
    if (attendedCount === 0 && noShowCount === 0) {
      confirmMessage = "No attendees marked. This will just mark the event as completed. Continue?";
    } else if (attendedCount === 0 && noShowCount > 0) {
      confirmMessage = `Remove ${noShowCount} no-show registration(s) and mark event as completed? (No hours will be assigned)`;
    } else if (noShowCount > 0) {
      confirmMessage = `Assign hours to ${needsAssignmentCount} attendee(s) and remove ${noShowCount} no-show registration(s)? (${alreadyAssignedCount} already have hours assigned and will be skipped)`;
    } else if (needsAssignmentCount === 0) {
      confirmMessage = "All attendees already have hours assigned! Mark event as completed?";
    } else {
      confirmMessage = `Assign hours to ${needsAssignmentCount} attendee(s)? (${alreadyAssignedCount} already have hours assigned and will be skipped)`;
    }

    // Show custom confirmation modal
    setConfirmModalData({
      title: "Assign Hours",
      message: confirmMessage,
      onConfirm: async () => {
        setShowConfirmModal(false);
        await executeAssignHours();
      }
    });
    setShowConfirmModal(true);
  };

  const executeAssignHours = async () => {
    if (!selectedEventForRegistrations) return;

    try {
      setAssigningHours(selectedEventForRegistrations._id);

      const response = await fetch("/api/events/assign-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventForRegistrations._id,
          adminEmail: user?.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign hours");
      }

      let message = "";
      if (data.assigned > 0 && data.removed > 0) {
        message = `Successfully assigned hours to ${data.assigned} attendee(s) and removed ${data.removed} no-show registration(s)!`;
      } else if (data.assigned > 0) {
        message = `Successfully assigned hours to ${data.assigned} attendee(s)!`;
      } else if (data.removed > 0) {
        message = `Removed ${data.removed} no-show registration(s). Event marked as completed.`;
      } else {
        message = "Event marked as completed.";
      }

      setSuccess(message);
      setTimeout(() => setSuccess(""), 3000);

      // Reload registrations to show updated hours
      if (selectedEventForRegistrations) {
        viewRegistrations(selectedEventForRegistrations);
      }
    } catch (err: any) {
      console.error("Error assigning hours:", err);
      setError(err.message || "Failed to assign hours. Please try again.");
      setTimeout(() => setError(""), 3000);
    } finally {
      setAssigningHours(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.eventType || !formData.eventCategory) {
      setError("Please select an event type");
      return;
    }

    try {
      if (!user) {
        setError('You must be logged in to create events');
        return;
      }

      const url = editingEvent ? "/api/events" : "/api/events";
      const method = editingEvent ? "PATCH" : "POST";
      const body = editingEvent
        ? { eventId: editingEvent._id, ...formData, adminEmail: user?.email }
        : {
            ...formData,
            createdBy: user.uid,
            createdByName: user.displayName || user.email,
            adminEmail: user?.email,
          };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save event");
      }
      setSuccess(
        editingEvent
          ? "Event updated successfully!"
          : "Event created successfully!"
      );
      setShowForm(false);
      setEditingEvent(null);
      resetForm();
      loadEvents();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      location: event.location,
      date: new Date(event.date).toISOString().split("T")[0],
      startTime: event.startTime,
      endTime: event.endTime,
      spotsAvailable: event.spotsAvailable,
      organization: event.organization,
      eventType: event.eventType,
      eventCategory: event.eventCategory,
    });
    setSelectedCategory(event.eventCategory);
    setShowForm(true);
  };

  const handleDelete = (event: Event) => {
    setEventToDelete(event);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;

    try {
      // Check if there are registrations
      const regResponse = await fetch(`/api/events/registrations/all?adminEmail=${encodeURIComponent(user?.email || '')}`);
      const regData = await regResponse.json();
      const registrations = regData.registrations?.filter((r: any) => r.eventId === eventToDelete._id && !r.cancelled) || [];

      if (!regResponse.ok) {
        console.warn('Failed to fetch registrations for delete notification — proceeding without email alerts');
      }

      if (registrations.length > 0 && sendCancellationEmail) {
        // Send cancellation emails
        setSendingNotification(true);
        const recipients = registrations.map((r: any) => ({
          email: r.userEmail,
          name: r.userName
        }));

        const emailRes = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminEmail: user?.email,
            to: recipients.map((r: any) => r.email),
            subject: `Event Cancelled: ${eventToDelete.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #A7144C;">Event Cancelled</h2>
                <p>We regret to inform you that the following event has been cancelled:</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">${eventToDelete.title}</h3>
                  <p><strong>Date:</strong> ${new Date(eventToDelete.date).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> ${formatTime(eventToDelete.startTime)} - ${formatTime(eventToDelete.endTime)}</p>
                  <p><strong>Location:</strong> ${eventToDelete.location}</p>
                  ${cancellationReason ? `<p><strong>Reason:</strong> ${cancellationReason}</p>` : ''}
                </div>
                <p>We apologize for any inconvenience. Please check the volunteer portal for other opportunities.</p>
                <hr style="border: 1px solid #e5e5e5; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">
                  This email was sent from the IH2 Volunteer Portal.
                </p>
              </div>
            `,
          }),
        });
        setSendingNotification(false);
        if (!emailRes.ok) {
          console.warn('Cancellation email failed to send — event will still be deleted');
        }
      }

      // Delete the event
      const response = await fetch(`/api/events?id=${eventToDelete._id}&adminEmail=${encodeURIComponent(user?.email || '')}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete event");
      }

      setSuccess(sendCancellationEmail && registrations.length > 0
        ? `Event deleted and ${registrations.length} notification(s) sent!`
        : "Event deleted successfully!");
      setShowDeleteModal(false);
      setEventToDelete(null);
      setCancellationReason("");
      loadEvents();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
      setSendingNotification(false);
    }
  };

  const handleStatusChange = async (
    event: Event,
    newStatus: "active" | "cancelled" | "completed"
  ) => {
    if (newStatus === "cancelled") {
      setEventToCancel(event);
      setShowCancelModal(true);
      return;
    }

    try {
      const response = await fetch("/api/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event._id,
          status: newStatus,
          adminEmail: user?.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update event status");
      }

      setSuccess("Event status updated successfully!");
      loadEvents();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };


  const confirmCancel = async () => {
    if (!eventToCancel) return;

    try {
      setSendingNotification(true);

      // Cancel the event and get recipients
      const response = await fetch("/api/events/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: eventToCancel._id,
          reason: cancellationReason,
          sendEmail: sendCancellationEmail,
          adminEmail: user?.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel event");
      }

      // Send emails if requested
      if (sendCancellationEmail && data.recipients && data.recipients.length > 0) {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminEmail: user?.email,
            to: data.recipients.map((r: any) => r.email),
            subject: `Event Cancelled: ${eventToCancel.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #A7144C;">Event Cancelled</h2>
                <p>We regret to inform you that the following event has been cancelled:</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">${eventToCancel.title}</h3>
                  <p><strong>Date:</strong> ${new Date(eventToCancel.date).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> ${formatTime(eventToCancel.startTime)} - ${formatTime(eventToCancel.endTime)}</p>
                  <p><strong>Location:</strong> ${eventToCancel.location}</p>
                  ${cancellationReason ? `<p><strong>Reason:</strong> ${cancellationReason}</p>` : ''}
                </div>
                <p>We apologize for any inconvenience. Please check the volunteer portal for other opportunities.</p>
                <hr style="border: 1px solid #e5e5e5; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">
                  This email was sent from the IH2 Volunteer Portal.
                </p>
              </div>
            `,
          }),
        });
      }

      setSuccess(sendCancellationEmail && data.registrationsCount > 0
        ? `Event cancelled and ${data.registrationsCount} notification(s) sent!`
        : "Event cancelled successfully!");
      setShowCancelModal(false);
      setEventToCancel(null);
      setCancellationReason("");
      setSendingNotification(false);
      loadEvents();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
      setSendingNotification(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      location: "20 Leonberg Road, Building E Cranberry Township, PA 16066",
      date: "",
      startTime: "",
      endTime: "",
      spotsAvailable: 10,
      organization: "IH2",
      eventType: "",
      eventCategory: "",
    });
    setSelectedCategory("");
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingEvent(null);
    resetForm();
    setError("");
  };

  const copyEventLink = (eventId: string) => {
    const url = `${window.location.origin}/events/${eventId}`;
    navigator.clipboard.writeText(url).then(() => {
      setSuccess("Event link copied to clipboard!");
      setTimeout(() => setSuccess(""), 3000);
    }).catch(() => {
      setError("Failed to copy link");
      setTimeout(() => setError(""), 3000);
    });
  };

  const copyCheckInLink = (_eventId: string) => {
    const url = `${window.location.origin}/check-in`;
    navigator.clipboard.writeText(url).then(() => {
      setSuccess("Check-in link copied! This universal URL works for all events — volunteers are auto-matched by time.");
      setTimeout(() => setSuccess(""), 5000);
    }).catch(() => {
      setError("Failed to copy link");
      setTimeout(() => setError(""), 3000);
    });
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.date).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  const changeMonth = (direction: number) => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + direction, 1));
  };

  const addUserToEvent = async () => {
    if (!addUserEmail.trim() || !selectedEventForRegistrations) {
      setError("Please enter a valid email address");
      return;
    }

    setAddingUser(true);
    setError("");

    try {
      const response = await fetch("/api/events/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventForRegistrations._id,
          userEmail: addUserEmail.trim(),
          retroactive: true,
          adminEmail: user?.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add user to event");
      }

      setSuccess(`Successfully added ${addUserEmail} to the event`);
      setAddUserEmail("");
      setShowAddUserForm(false);

      // Reload registrations
      await viewRegistrations(selectedEventForRegistrations);

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to add user to event");
    } finally {
      setAddingUser(false);
    }
  };

  const addGroupToEvent = async () => {
    if (!addGroupName.trim() || !selectedEventForRegistrations) {
      setError("Please enter a group name");
      return;
    }
    if (addGroupSize < 1) {
      setError("Group size must be at least 1");
      return;
    }
    setAddingGroup(true);
    setError("");
    try {
      const response = await fetch("/api/events/register-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventForRegistrations._id,
          groupName: addGroupName.trim(),
          groupSize: addGroupSize,
          adminEmail: user?.email,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add group");
      setSuccess(`Added group "${addGroupName.trim()}" (${addGroupSize} people) to the event`);
      setAddGroupName("");
      setAddGroupSize(2);
      setShowAddGroupForm(false);
      await viewRegistrations(selectedEventForRegistrations);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to add group");
    } finally {
      setAddingGroup(false);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Event Management
          </h1>
          <p className="text-gray-600">Create and manage volunteer events</p>
        </div>
        <button
          onClick={() => {
            if (showForm) setEditingEvent(null);
            setShowForm(!showForm);
          }}
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          {showForm ? "Cancel" : "+ Create Event"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Event Form */}
      {showForm && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {editingEvent ? "Edit Event" : "Create New Event"}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Category *
                </label>
                <select
                  required
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    const isOther = e.target.value === "Other";
                    setFormData({
                      ...formData,
                      eventCategory: e.target.value,
                      eventType: isOther ? "Custom" : ""
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a category...</option>
                  {EVENT_TYPES.map((category) => (
                    <option key={category.category} value={category.category}>
                      {category.category}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>

              {selectedCategory && selectedCategory !== "Other" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Type *
                  </label>
                  <select
                    required
                    value={formData.eventType}
                    onChange={(e) => {
                      const selectedType = EVENT_TYPES
                        .find(cat => cat.category === selectedCategory)
                        ?.types.find(type => type.name === e.target.value);
                      setFormData({
                        ...formData,
                        eventType: e.target.value,
                        title: selectedType ? selectedType.name : "",
                        description: selectedType ? selectedType.description : ""
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select an event type...</option>
                    {EVENT_TYPES
                      .find(cat => cat.category === selectedCategory)
                      ?.types.map((type) => (
                        <option key={type.name} value={type.name}>
                          {type.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {selectedCategory === "Other" && (
                <>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Food Bank Volunteer"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      required
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Describe the volunteer opportunity..."
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., 123 Main St, Pittsburgh, PA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization
                </label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) =>
                    setFormData({ ...formData, organization: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., IH2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Spots *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.spotsAvailable}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      spotsAvailable: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                type="submit"
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-semibold transition"
              >
                {editingEvent ? "Update Event" : "Create Event"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events List */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Events</h2>
              <div className="flex gap-4">
                {/* View Mode Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                      viewMode === "list"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    List
                  </button>
                  <button
                    onClick={() => setViewMode("calendar")}
                    className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                      viewMode === "calendar"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Calendar
                  </button>
                </div>

                {/* Event Filter */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEventFilter("active");
                      setSearchDate("");
                      setPastEventsToShow(5);
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      eventFilter === "active"
                        ? "bg-primary-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Active ({events.filter(e => e.status === "active").length})
                  </button>
                  <button
                    onClick={() => {
                      setEventFilter("past");
                      setSearchDate("");
                      setPastEventsToShow(5);
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      eventFilter === "past"
                        ? "bg-primary-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Past ({events.filter(e => e.status === "completed" || e.status === "cancelled").length})
                  </button>
                </div>
              </div>
            </div>

            {/* Date Search - Only show in list view */}
            {viewMode === "list" && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Search by Date:</label>
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {searchDate && (
                  <button
                    onClick={() => setSearchDate("")}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
                  >
                    Clear Date
                  </button>
                )}
              </div>
            )}

            {/* Calendar Month Navigation - Only show in calendar view */}
            {viewMode === "calendar" && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => changeMonth(-1)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  ← Previous
                </button>
                <h3 className="text-lg font-bold text-gray-900">
                  {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => changeMonth(1)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>

        {viewMode === "calendar" ? (
          // Calendar View
          <div className="p-6">
            {(() => {
              const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(calendarMonth);
              const days = [];

              // Add empty cells for days before the first of the month
              for (let i = 0; i < startingDayOfWeek; i++) {
                days.push(<div key={`empty-${i}`} className="min-h-32 border border-gray-200 bg-gray-50"></div>);
              }

              // Add cells for each day of the month
              for (let day = 1; day <= daysInMonth; day++) {
                const currentDate = new Date(year, month, day);
                const dayEvents = getEventsForDate(currentDate);
                const isToday = new Date().toDateString() === currentDate.toDateString();

                days.push(
                  <div key={day} className={`min-h-32 border border-gray-200 p-2 ${isToday ? 'bg-blue-50' : 'bg-white'}`}>
                    <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.map((event) => (
                        <div
                          key={event._id}
                          onClick={() => viewRegistrations(event)}
                          className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 transition ${
                            event.status === "active"
                              ? "bg-green-100 text-green-800 border border-green-300"
                              : event.status === "cancelled"
                              ? "bg-red-100 text-red-800 border border-red-300"
                              : "bg-gray-100 text-gray-800 border border-gray-300"
                          }`}
                        >
                          <div className="font-semibold truncate">{event.title}</div>
                          <div className="truncate">{formatTime(event.startTime)} - {formatTime(event.endTime)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-0 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center font-bold text-gray-700 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-0 border-l border-t border-gray-200">
                    {days}
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          // List View
          (() => {
          let filteredEvents = events.filter(event => {
            // Filter by status
            const statusMatch = eventFilter === "active"
              ? event.status === "active"
              : event.status === "completed" || event.status === "cancelled";

            if (!statusMatch) return false;

            // Filter by date if search date is set
            if (searchDate) {
              const eventDate = new Date(event.date).toISOString().split('T')[0];
              return eventDate === searchDate;
            }

            return true;
          });

          // Sort past events by date (most recent first)
          if (eventFilter === "past") {
            filteredEvents = filteredEvents.sort((a, b) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
          }

          // Limit past events to the number to show (unless searching by date)
          const displayedEvents = eventFilter === "past" && !searchDate
            ? filteredEvents.slice(0, pastEventsToShow)
            : filteredEvents;

          const hasMorePastEvents = eventFilter === "past" && !searchDate && filteredEvents.length > pastEventsToShow;

          return displayedEvents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {searchDate
                  ? `No events found on ${new Date(searchDate).toLocaleDateString()}.`
                  : eventFilter === "active"
                  ? "No active events found."
                  : "No past events found."}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200">
                {displayedEvents.map((event) => (
              <div key={event._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {event.title}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          event.status === "active"
                            ? "bg-green-100 text-green-800"
                            : event.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{event.description}</p>
                    <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Date:</span>{" "}
                        {new Date(event.date).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Time:</span>{" "}
                        {formatTime(event.startTime)} - {formatTime(event.endTime)}
                      </div>
                      <div>
                        <span className="font-medium">Location:</span>{" "}
                        <a
                          href={getGoogleMapsUrl(event.location)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {event.location}
                        </a>
                      </div>
                      <div>
                        <span className="font-medium">Spots:</span>{" "}
                        {event.spotsRemaining} / {event.spotsAvailable}
                      </div>
                      <div>
                        <span className="font-medium">Created by:</span>{" "}
                        {event.createdByName}
                      </div>
                      <div>
                        <span className="font-medium">Organization:</span>{" "}
                        {event.organization}
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    <button
                      onClick={() => viewRegistrations(event)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition"
                    >
                      View Registrations
                    </button>
                    {event.status === "active" && (
                      <button
                        onClick={() => copyEventLink(event._id)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Link
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(event)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
                    >
                      Edit
                    </button>
                    <select
                      value={event.status}
                      onChange={(e) =>
                        handleStatusChange(
                          event,
                          e.target.value as "active" | "cancelled" | "completed"
                        )
                      }
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="active">Active</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="completed">Completed</option>
                    </select>
                    <button
                      onClick={() => handleDelete(event)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
                ))}
              </div>

              {/* Load More Button */}
              {hasMorePastEvents && (
                <div className="p-6 text-center border-t border-gray-200">
                  <button
                    onClick={() => setPastEventsToShow(prev => prev + 5)}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-semibold"
                  >
                    Load More Past Events ({filteredEvents.length - pastEventsToShow} remaining)
                  </button>
                </div>
              )}
            </>
          );
        })()
        )}
      </div>

      {/* Cancel Event Modal */}
      {showCancelModal && eventToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Cancel Event</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel "{eventToCancel.title}"?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Reason (Optional)
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="E.g., Due to weather conditions..."
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sendCancellationEmail}
                  onChange={(e) => setSendCancellationEmail(e.target.checked)}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  Send cancellation notification to registered users
                </span>
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setEventToCancel(null);
                  setCancellationReason("");
                }}
                disabled={sendingNotification}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmCancel}
                disabled={sendingNotification}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {sendingNotification ? "Processing..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Event Modal */}
      {showDeleteModal && eventToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Event</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to permanently delete "{eventToDelete.title}"? This action cannot be undone.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Deletion (Optional)
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="E.g., Event was created by mistake..."
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sendCancellationEmail}
                  onChange={(e) => setSendCancellationEmail(e.target.checked)}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  Notify registered users about deletion
                </span>
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setEventToDelete(null);
                  setCancellationReason("");
                }}
                disabled={sendingNotification}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={sendingNotification}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {sendingNotification ? "Processing..." : "Confirm Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registrations Modal */}
      {showRegistrationsModal && selectedEventForRegistrations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900">
                Registrations for {selectedEventForRegistrations.title}
              </h3>
              <button
                onClick={() => {
                  setShowRegistrationsModal(false);
                  setSelectedEventForRegistrations(null);
                  setRegistrations([]);
                  setShowAddUserForm(false);
                  setAddUserEmail("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingRegistrations ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : registrations.length === 0 ? (
              <>
                <p className="text-gray-600 text-center py-8">No registrations for this event yet.</p>

                {/* Action Buttons for empty event */}
                <div className="mt-4 flex gap-3 justify-center flex-wrap">
                  <button
                    onClick={() => copyCheckInLink(selectedEventForRegistrations._id)}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Copy Check-in Link
                  </button>
                  <button
                    onClick={() => { setShowAddUserForm(!showAddUserForm); setShowAddGroupForm(false); }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
                  >
                    {showAddUserForm ? "Cancel" : "+ Add User"}
                  </button>
                  <button
                    onClick={() => { setShowAddGroupForm(!showAddGroupForm); setShowAddUserForm(false); }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition"
                  >
                    {showAddGroupForm ? "Cancel" : "+ Add Group"}
                  </button>
                  <button
                    onClick={() => {
                      setShowRegistrationsModal(false);
                      handleDelete(selectedEventForRegistrations);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
                  >
                    🗑️ Delete Event
                  </button>
                </div>

                {/* Add User Form for empty event */}
                {showAddUserForm && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Add User Retroactively</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Enter the email of a volunteer who attended but didn't register. They will be added to this event.
                    </p>
                    <div className="flex gap-3">
                      <input
                        type="email"
                        value={addUserEmail}
                        onChange={(e) => setAddUserEmail(e.target.value)}
                        placeholder="volunteer@example.com"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button
                        onClick={addUserToEvent}
                        disabled={addingUser || !addUserEmail.trim()}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {addingUser ? "Adding..." : "Add User"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Add Group Form for empty event */}
                {showAddGroupForm && (
                  <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-1">Add Group</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Add a named group with a headcount. Bypasses spot limits.
                    </p>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Group name</label>
                        <input
                          type="text"
                          value={addGroupName}
                          onChange={(e) => setAddGroupName(e.target.value)}
                          placeholder="e.g. Smith Family, Church Group"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="w-28">
                        <label className="block text-xs font-medium text-gray-600 mb-1">People</label>
                        <input
                          type="number"
                          min="1"
                          value={addGroupSize}
                          onChange={(e) => setAddGroupSize(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <button
                        onClick={addGroupToEvent}
                        disabled={addingGroup || !addGroupName.trim()}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {addingGroup ? "Adding..." : "Add Group"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="font-semibold">Total Registrations:</span> {registrations.length}
                      <div className="text-xs text-gray-600 mt-1">
                        • Individual: {registrations.filter(r => (r.totalAttendees || 1) === 1).length}
                        <br />
                        • Groups: {registrations.filter(r => (r.totalAttendees || 1) > 1).length}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold">Total People Registered:</span>{' '}
                      {registrations.reduce((sum, r) => sum + (r.totalAttendees || 1), 0)}
                      <div className="text-xs text-gray-600 mt-1">
                        Spots Used: {selectedEventForRegistrations.spotsAvailable - selectedEventForRegistrations.spotsRemaining} / {selectedEventForRegistrations.spotsAvailable}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-xs text-gray-700 border-t border-blue-200 pt-2">
                    <div>
                      <strong>✅ Total Attended:</strong> {registrations.filter(r => (r.attended || r.checkedIn) && !r.cancelled).length}
                    </div>
                    <div>
                      <strong>📱 QR Check-ins:</strong> {registrations.filter(r => r.checkedIn && !r.cancelled).length}
                    </div>
                    <div>
                      <strong>✓ Manual Marked:</strong> {registrations.filter(r => r.attended && !r.checkedIn && !r.cancelled).length}
                    </div>
                    <div>
                      <strong>❌ Not Attended:</strong> {registrations.filter(r => !r.attended && !r.checkedIn && !r.cancelled).length}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-700 border-t border-blue-200 pt-2 mt-2">
                    <div>
                      <strong>💜 Hours Assigned:</strong> {registrations.reduce((sum, r) => sum + (r.hoursCompleted || 0), 0).toFixed(1)} hrs ({registrations.filter(r => r.hoursCompleted > 0 && !r.cancelled).length} people)
                    </div>
                    <div>
                      <strong>🚫 Cancelled:</strong> {registrations.filter(r => r.cancelled).length}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mb-4 flex gap-3 flex-wrap">
                  <button
                    onClick={() => copyCheckInLink(selectedEventForRegistrations._id)}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Copy Check-in Link
                  </button>
                  <button
                    onClick={() => { setShowAddUserForm(!showAddUserForm); setShowAddGroupForm(false); }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
                  >
                    {showAddUserForm ? "Cancel" : "+ Add User"}
                  </button>
                  <button
                    onClick={() => { setShowAddGroupForm(!showAddGroupForm); setShowAddUserForm(false); }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition"
                  >
                    {showAddGroupForm ? "Cancel" : "+ Add Group"}
                  </button>
                  <button
                    onClick={() => {
                      setShowRegistrationsModal(false);
                      handleDelete(selectedEventForRegistrations);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
                  >
                    🗑️ Delete Event
                  </button>
                </div>

                {/* Add User Form */}
                {showAddUserForm && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Add User Retroactively</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Enter the email of a volunteer who attended but didn't register. They will be added to this event.
                    </p>
                    <div className="flex gap-3">
                      <input
                        type="email"
                        value={addUserEmail}
                        onChange={(e) => setAddUserEmail(e.target.value)}
                        placeholder="volunteer@example.com"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button
                        onClick={addUserToEvent}
                        disabled={addingUser || !addUserEmail.trim()}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {addingUser ? "Adding..." : "Add User"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Add Group Form */}
                {showAddGroupForm && (
                  <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-1">Add Group</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Add a named group with a headcount. Bypasses spot limits.
                    </p>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Group name</label>
                        <input
                          type="text"
                          value={addGroupName}
                          onChange={(e) => setAddGroupName(e.target.value)}
                          placeholder="e.g. Smith Family, Church Group"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="w-28">
                        <label className="block text-xs font-medium text-gray-600 mb-1">People</label>
                        <input
                          type="number"
                          min="1"
                          value={addGroupSize}
                          onChange={(e) => setAddGroupSize(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <button
                        onClick={addGroupToEvent}
                        disabled={addingGroup || !addGroupName.trim()}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {addingGroup ? "Adding..." : "Add Group"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {registrations
                    .sort((a, b) => {
                      // Sort priority: 1. QR check-ins first, 2. Attended, 3. Cancelled last, 4. Regular registrations
                      if (a.cancelled && !b.cancelled) return 1;
                      if (!a.cancelled && b.cancelled) return -1;
                      if (a.checkedIn && !b.checkedIn) return -1;
                      if (!a.checkedIn && b.checkedIn) return 1;
                      if (a.attended && !b.attended) return -1;
                      if (!a.attended && b.attended) return 1;
                      return 0;
                    })
                    .map((registration) => (
                    <div
                      key={registration._id}
                      className={`border rounded-lg p-4 ${
                        registration.cancelled
                          ? 'border-red-300 bg-red-50'
                          : registration.checkedIn
                          ? 'border-blue-300 bg-blue-50'
                          : registration.attended
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className={`font-semibold ${registration.cancelled ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                              {registration.userName}
                            </h4>
                            {registration.totalAttendees > 1 && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                Group of {registration.totalAttendees}
                              </span>
                            )}
                            {registration.isGroupCheckIn && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                                👨‍👩‍👧‍👦 Family/Guests
                              </span>
                            )}
                            {registration.cancelled && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                                CANCELLED
                              </span>
                            )}
                            {!registration.cancelled && registration.attended && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                ✓ ATTENDED
                              </span>
                            )}
                            {!registration.cancelled && registration.checkedIn && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                📱 QR CHECK-IN
                              </span>
                            )}
                            {!registration.cancelled && registration.hoursCompleted > 0 && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                                {registration.hoursCompleted} hrs assigned
                              </span>
                            )}
                            {!registration.cancelled && !registration.attended && !registration.checkedIn && (
                              <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded-full">
                                ❌ NOT ATTENDED
                              </span>
                            )}
                          </div>
                          <p className={`text-sm mb-1 ${registration.cancelled ? 'text-gray-500' : 'text-gray-600'}`}>
                            {registration.userEmail}
                          </p>
                          <p className={`text-sm ${registration.cancelled ? 'text-gray-500' : 'text-gray-600'}`}>
                            Registered: {new Date(registration.registeredAt).toLocaleDateString()}
                          </p>

                          {/* Always show attendee list */}
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-semibold text-gray-700 mb-1">
                              {registration.totalAttendees > 1 ? `All Attendees (${registration.totalAttendees}):` : 'Attendee:'}
                            </p>
                            <ul className="text-sm text-gray-600 list-disc list-inside">
                              <li><strong>{registration.userName}</strong> (Primary Registrant) - {registration.userEmail}</li>
                              {registration.attendeeNames && registration.attendeeNames.length > 0 ? (
                                registration.attendeeNames.map((name: string, index: number) => (
                                  <li key={index}>{name}</li>
                                ))
                              ) : registration.totalAttendees > 1 ? (
                                <li className="text-gray-400 italic">No additional attendee names provided</li>
                              ) : null}
                            </ul>
                          </div>

                          {registration.cancelled && registration.cancellationReason && (
                            <div className="mt-2 text-sm text-red-700">
                              <strong>Reason:</strong> {registration.cancellationReason}
                            </div>
                          )}
                        </div>

                        {/* Attendance checkbox */}
                        {!registration.cancelled && (
                          <div className="ml-4">
                            <label className={`flex items-center gap-2 ${registration.checkedIn ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                              <input
                                type="checkbox"
                                checked={registration.attended || registration.checkedIn || false}
                                onChange={() => toggleAttendance(registration._id, registration.attended || false)}
                                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              />
                              <span className="text-sm font-medium text-gray-700">
                                Attended
                              </span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {(() => {
                  const totalAttended = registrations.filter(r => (r.attended || r.checkedIn) && !r.cancelled).length;
                  const alreadyAssigned = registrations.filter(r => r.hoursCompleted > 0 && !r.cancelled).length;
                  const needsAssignment = totalAttended - alreadyAssigned;
                  return (
                    <>
                      <div>{totalAttended} attendee(s) total • {alreadyAssigned} already have hours • {needsAssignment} need hours assigned</div>
                      <div className="text-xs mt-1">
                        ({registrations.filter(r => r.checkedIn && !r.cancelled).length} QR check-ins auto-assigned, {registrations.filter(r => r.attended && !r.checkedIn && !r.cancelled).length} manual attended)
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={assignHoursToAttendees}
                  disabled={assigningHours !== null}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {assigningHours ? "Assigning Hours..." : "Assign/Update Hours"}
                </button>
                <button
                  onClick={() => {
                    setShowRegistrationsModal(false);
                    setSelectedEventForRegistrations(null);
                    setRegistrations([]);
                    setShowAddUserForm(false);
                    setAddUserEmail("");
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                >
                  Close
                </button>
              </div>
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
