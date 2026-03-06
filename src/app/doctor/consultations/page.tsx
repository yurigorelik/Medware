"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Consultation {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  patient: { name: string; email: string };
  summary: { id: string; review: { id: string } | null } | null;
  _count: { messages: number; attachments: number };
}

export default function DoctorConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [messageModal, setMessageModal] = useState<Consultation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/consultation");
        if (res.ok) {
          const data = await res.json();
          setConsultations(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load consultations:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function handleDelete(consultationId: string) {
    setConfirmDelete(null);
    setDeleting(consultationId);
    try {
      const res = await fetch(`/api/consultation/${consultationId}/delete`, {
        method: "DELETE",
      });

      if (res.ok) {
        setConsultations((prev) => prev.filter((c) => c.id !== consultationId));
        setActionMessage("Consultation deleted.");
        setTimeout(() => setActionMessage(""), 3000);
      } else {
        const data = await res.json();
        setActionMessage(data.error || "Failed to delete.");
      }
    } catch {
      setActionMessage("Failed to delete consultation.");
    } finally {
      setDeleting(null);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageModal || !messageText.trim()) return;

    setSendingMessage(true);
    try {
      const res = await fetch(`/api/consultation/${messageModal.id}/doctor-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText.trim() }),
      });

      if (res.ok) {
        setMessageModal(null);
        setMessageText("");
        setActionMessage("Message sent to patient.");
        setTimeout(() => setActionMessage(""), 3000);
      } else {
        const data = await res.json();
        setActionMessage(data.error || "Failed to send message.");
      }
    } catch {
      setActionMessage("Failed to send message.");
    } finally {
      setSendingMessage(false);
    }
  }

  const filtered =
    filter === "ALL"
      ? consultations
      : consultations.filter((c) => c.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-gray-500">Loading consultations...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Consultations</h1>
        <Link
          href="/doctor/dashboard"
          className="btn-secondary text-sm"
        >
          &larr; Dashboard
        </Link>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${actionMessage.includes("Failed") || actionMessage.includes("error") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
          {actionMessage}
        </div>
      )}

      {/* Message Modal */}
      {messageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl">
            <h3 className="font-semibold mb-1">Message Patient</h3>
            <p className="text-sm text-gray-500 mb-4">
              Send an email to {messageModal.patient.name} ({messageModal.patient.email})
            </p>
            <form onSubmit={handleSendMessage}>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="textarea-field mb-4"
                rows={5}
                placeholder="Type your message to the patient..."
                autoFocus
                required
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setMessageModal(null); setMessageText(""); }}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-sm"
                  disabled={sendingMessage || !messageText.trim()}
                >
                  {sendingMessage ? "Sending..." : "Send Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="font-semibold text-lg mb-2">Delete Consultation</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete the consultation with <span className="font-medium">{confirmDelete.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["ALL", "ACTIVE", "SUMMARY_GENERATED", "COMPLETED", "CLOSED"].map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === s
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {s === "ALL" ? "All" : s.replace(/_/g, " ")}
              {s !== "ALL" && (
                <span className="ml-1.5 text-xs">
                  ({consultations.filter((c) => c.status === s).length})
                </span>
              )}
            </button>
          )
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">
          No consultations found
          {filter !== "ALL" && " for this filter"}.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className={`card flex items-center justify-between ${
                c.status === "SUMMARY_GENERATED" && !c.summary?.review
                  ? "border-l-4 border-yellow-400"
                  : ""
              }`}
            >
              <div>
                <div className="font-medium">{c.patient.name}</div>
                <div className="text-sm text-gray-500">
                  {c.patient.email} &middot; {c._count.messages} messages
                  {c._count.attachments > 0 &&
                    ` · ${c._count.attachments} files`}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Started {new Date(c.createdAt).toLocaleDateString()} &middot;
                  Updated {new Date(c.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={
                    c.status === "ACTIVE"
                      ? "badge-active"
                      : c.status === "COMPLETED"
                        ? "badge-completed"
                        : "badge-pending"
                  }
                >
                  {c.status.replace(/_/g, " ")}
                </span>
                <button
                  onClick={() => setMessageModal(c)}
                  className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                  title="Message patient"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </button>
                <Link
                  href={`/doctor/consultations/${c.id}`}
                  className={
                    c.status === "SUMMARY_GENERATED" && !c.summary?.review
                      ? "btn-primary text-sm"
                      : "btn-secondary text-sm"
                  }
                >
                  {c.status === "SUMMARY_GENERATED" && !c.summary?.review
                    ? "Review"
                    : "View"}
                </Link>
                <button
                  onClick={() => setConfirmDelete({ id: c.id, name: c.patient.name })}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete consultation"
                  disabled={deleting === c.id}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
