"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { isAdmin } from "@/lib/admin";

interface EmailRecipient {
  email: string;
  name: string;
  selected: boolean;
}

interface Event {
  _id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
}

function AdminEmailPanel() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [filterType, setFilterType] = useState<"all" | "current" | "event" | "specific">("all");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loadingRecipients, setLoadingRecipients] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !isAdmin(user.email))) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && isAdmin(user.email)) {
      loadEvents();
    }
  }, [user]);

  useEffect(() => {
    if (user && isAdmin(user.email)) {
      loadRecipients();
    }
  }, [filterType, selectedEventId, user]);

  // Check for pre-selected recipient from URL
  useEffect(() => {
    const recipientParam = searchParams.get('recipient');
    if (recipientParam) {
      try {
        const recipient = JSON.parse(decodeURIComponent(recipientParam));
        setFilterType("specific");
        setRecipients([{
          email: recipient.email,
          name: recipient.name,
          selected: true,
        }]);
        setLoadingRecipients(false);
      } catch (err) {
        console.error("Error parsing recipient param:", err);
      }
    }
  }, [searchParams]);

  const loadEvents = async () => {
    try {
      const response = await fetch("/api/events");
      const data = await response.json();

      if (response.ok) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error("Error loading events:", err);
    }
  };

  const loadRecipients = async () => {
    setLoadingRecipients(true);
    try {
      if (filterType === "all") {
        // Get all volunteers (prior platform + current)
        const response = await fetch("/api/volunteers");
        const data = await response.json();

        if (response.ok) {
          const usersList: EmailRecipient[] = data.volunteers.map((vol: any) => ({
            email: vol.email,
            name: `${vol.firstName} ${vol.lastName}`,
            selected: true,
          }));
          setRecipients(usersList);
        }
      } else if (filterType === "current") {
        // Get only current platform users (registered accounts)
        const response = await fetch("/api/admin/users");
        const data = await response.json();

        if (response.ok) {
          const usersList: EmailRecipient[] = data.users.map((user: any) => ({
            email: user.email,
            name: user.displayName || user.email,
            selected: true,
          }));
          setRecipients(usersList);
        }
      } else if (filterType === "event" && selectedEventId) {
        // Get users registered for specific event
        const response = await fetch("/api/events/registrations/all");
        const data = await response.json();

        if (response.ok) {
          const usersList: EmailRecipient[] = [];
          const seenEmails = new Set<string>();

          data.registrations
            .filter((reg: any) => reg.eventId === selectedEventId)
            .forEach((reg: any) => {
              if (!seenEmails.has(reg.userEmail)) {
                seenEmails.add(reg.userEmail);
                usersList.push({
                  email: reg.userEmail,
                  name: reg.userName || reg.userEmail,
                  selected: true,
                });
              }
            });

          setRecipients(usersList);
        }
      } else if (filterType === "specific") {
        // Recipients already set from URL parameter, skip loading
        setLoadingRecipients(false);
        return;
      }
    } catch (err) {
      console.error("Error loading recipients:", err);
      setError("Failed to load recipients");
    } finally {
      setLoadingRecipients(false);
    }
  };

  const toggleRecipient = (email: string) => {
    setRecipients(recipients.map(r =>
      r.email === email ? { ...r, selected: !r.selected } : r
    ));
  };

  const selectAll = () => {
    setRecipients(recipients.map(r => ({ ...r, selected: true })));
  };

  const deselectAll = () => {
    setRecipients(recipients.map(r => ({ ...r, selected: false })));
  };

  const sendEmails = async () => {
    const selectedRecipients = recipients.filter(r => r.selected);

    if (selectedRecipients.length === 0) {
      setError("Please select at least one recipient");
      return;
    }

    if (!subject || !message) {
      setError("Please fill in subject and message");
      return;
    }

    setSending(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedRecipients.map(r => r.email),
          subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #A7144C;">Inspired Hearts and Hands (IH2)</h2>
              <div style="margin: 20px 0;">
                ${message.replace(/\n/g, '<br>')}
              </div>
              <hr style="border: 1px solid #e5e5e5; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">
                This email was sent from the IH2 Volunteer Portal.<br>
                Phone: 724-230-6378 | Email: info@inspiredheartsandhands.com
              </p>
            </div>
          `,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = data.error || "Failed to send emails";
        if (data.suggestion) {
          errorMessage += ` - ${data.suggestion}`;
        }
        if (data.errors && data.errors.length > 0) {
          console.error("Email sending errors:", data.errors);
          errorMessage = `Failed to send to ${data.errors.length} recipient(s). ${data.suggestion || 'Check server logs for details.'}`;
        }
        setError(errorMessage);
        return;
      }

      if (data.sent > 0) {
        setSuccess(true);
        setSubject("");
        setMessage("");
        if (data.failed > 0) {
          let failedMessage = `Sent to ${data.sent} recipient(s), but ${data.failed} failed.`;
          if (data.warning) {
            failedMessage += ` Note: ${data.warning}`;
          }
          setError(failedMessage);
          console.error("Some emails failed:", data.errors);
        }
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send emails. Check that the email service is properly configured.");
    } finally {
      setSending(false);
    }
  };

  if (loading || loadingRecipients) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin(user.email)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className="text-white py-12 relative overflow-hidden bg-white"
        style={{
          backgroundImage: `url('/handprint.png')`,
          backgroundPosition: 'center',
          backgroundSize: 'auto 100%',
          backgroundRepeat: 'repeat-x'
        }}
      >
        <div className="container mx-auto px-4 relative z-10">
          <h1 className="text-6xl font-bold mb-4 text-gray-900" style={{ textShadow: '3px 3px 6px rgba(255,255,255,0.9), -2px -2px 4px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.8)' }}>
            Admin Panel
          </h1>
          <p className="text-2xl font-semibold text-gray-800" style={{ textShadow: '2px 2px 4px rgba(255,255,255,0.9), -1px -1px 2px rgba(255,255,255,0.9)' }}>
            Send emails to volunteers
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Emails sent successfully!</span>
              </div>
            </div>
          )}

          {/* Filter Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send to:
            </label>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setFilterType("all")}
                className={`px-6 py-2 rounded-lg font-semibold transition ${
                  filterType === "all"
                    ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                All Volunteers
              </button>
              <button
                onClick={() => setFilterType("current")}
                className={`px-6 py-2 rounded-lg font-semibold transition ${
                  filterType === "current"
                    ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                Current Platform Only
              </button>
              <button
                onClick={() => setFilterType("event")}
                className={`px-6 py-2 rounded-lg font-semibold transition ${
                  filterType === "event"
                    ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                Event Registrations
              </button>
              <button
                onClick={() => router.push("/admin/volunteers")}
                className={`px-6 py-2 rounded-lg font-semibold transition ${
                  filterType === "specific"
                    ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                {filterType === "specific" ? "Specific User ✓" : "Select Specific User →"}
              </button>
            </div>
          </div>

          {/* Event Selector (if event filter is selected) */}
          {filterType === "event" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Event:
              </label>
              <select
                value={selectedEventId || ""}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select an event...</option>
                {events.map((event) => {
                  const eventDate = new Date(event.date);
                  const dateStr = eventDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  const timeStr = event.startTime && event.endTime
                    ? ` (${event.startTime} - ${event.endTime})`
                    : '';

                  return (
                    <option key={event._id} value={event._id}>
                      {event.title} - {dateStr}{timeStr}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Recipients */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipients
            </label>

            {recipients.length === 0 ? (
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <p className="text-gray-500 text-center">
                  {filterType === "event" && !selectedEventId
                    ? "Please select an event to see recipients"
                    : "No recipients found"}
                </p>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                {/* Summary Header */}
                <div className="bg-primary-50 border-b border-gray-300 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        {filterType === "all"
                          ? `All ${recipients.length} volunteers selected`
                          : filterType === "current"
                          ? `All ${recipients.length} current platform users selected`
                          : filterType === "specific"
                          ? `1 specific user selected`
                          : `${recipients.filter(r => r.selected).length} of ${recipients.length} recipients selected`
                        }
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {filterType === "all"
                          ? "Prior platform and current platform users"
                          : filterType === "current"
                          ? "Only users who have registered on current platform"
                          : filterType === "specific"
                          ? `Sending to: ${recipients[0]?.name} (${recipients[0]?.email})`
                          : `Users registered for selected event`}
                      </p>
                    </div>
                    {filterType === "event" && (
                      <div className="flex gap-2">
                        <button
                          onClick={selectAll}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
                        >
                          Select All
                        </button>
                        <button
                          onClick={deselectAll}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Collapsible Recipient List - Only show for event registrations */}
                {filterType === "event" && (
                  <details className="group">
                    <summary className="cursor-pointer p-4 bg-gray-50 hover:bg-gray-100 transition flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        View/Edit Individual Recipients
                      </span>
                      <svg
                        className="w-5 h-5 text-gray-500 transition-transform group-open:rotate-180"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="max-h-60 overflow-y-auto p-4 bg-white">
                      <div className="space-y-2">
                        {recipients.map((recipient) => (
                          <label
                            key={recipient.email}
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={recipient.selected}
                              onChange={() => toggleRecipient(recipient.email)}
                              className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                            />
                            <div>
                              <div className="font-medium text-gray-900">{recipient.name}</div>
                              <div className="text-sm text-gray-500">{recipient.email}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </details>
                )}

                {/* Info message for Specific User */}
                {filterType === "specific" && (
                  <div className="p-4 bg-green-50 border-t border-green-200">
                    <p className="text-sm text-green-800">
                      <strong>Specific Recipient:</strong> This email will be sent only to the selected volunteer. To choose a different recipient, click "Select Specific User →" above or go to the Volunteer Directory.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Email Templates */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Templates:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSubject("Reminder: Upcoming Volunteer Event");
                  setMessage("This is a friendly reminder about your upcoming volunteer commitment.\n\nEvent: [Event Name]\nDate: [Event Date]\nTime: [Event Time]\nLocation: [Event Location]\n\nWe're looking forward to seeing you there! If you need to cancel, please let us know as soon as possible.\n\nThank you for your dedication to IH2!");
                }}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-medium"
              >
                Event Reminder
              </button>
              <button
                onClick={() => {
                  setSubject("IMPORTANT: Event Cancelled");
                  setMessage("We regret to inform you that the following event has been cancelled:\n\nEvent: [Event Name]\nOriginal Date: [Event Date]\n\nReason: [Reason for cancellation]\n\nWe apologize for any inconvenience. We'll notify you when this event is rescheduled.\n\nThank you for your understanding!");
                }}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm font-medium"
              >
                Event Cancellation
              </button>
              <button
                onClick={() => {
                  setSubject("New Volunteer Opportunities Available");
                  setMessage("We have exciting new volunteer opportunities available!\n\nVisit the volunteer portal to see all upcoming events and sign up:\n[Portal Link]\n\nThank you for your continued support of IH2!");
                }}
                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition text-sm font-medium"
              >
                New Opportunities
              </button>
            </div>
          </div>

          {/* Subject */}
          <div className="mb-6">
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Message */}
          <div className="mb-6">
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Email message"
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-vertical"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={sendEmails}
            disabled={sending || recipients.filter(r => r.selected).length === 0}
            className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {sending ? "Sending..." : `Send Email to ${recipients.filter(r => r.selected).length} Recipient(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}


export default function AdminPanel() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AdminEmailPanel />
    </Suspense>
  );
}
