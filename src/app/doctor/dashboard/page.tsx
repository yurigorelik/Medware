"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Portal {
  id: string;
  name: string;
  medicalField: string;
  isActive: boolean;
}

interface Consultation {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  patient: { name: string; email: string };
  summary: { id: string; review: { id: string } | null } | null;
  _count: { messages: number; attachments: number };
}

export default function DoctorDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [portal, setPortal] = useState<Portal | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [messageModal, setMessageModal] = useState<Consultation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [portalRes, consRes] = await Promise.all([
        fetch("/api/portal"),
        fetch("/api/consultation"),
      ]);

      const portalData = await portalRes.json();
      if (portalData && portalData.id) {
        setPortal(portalData);
      }

      if (consRes.ok) {
        const consData = await consRes.json();
        setConsultations(Array.isArray(consData) ? consData : []);
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(consultationId: string, patientName: string) {
    if (!confirm(`Are you sure you want to delete the consultation with ${patientName}? This action cannot be undone.`)) {
      return;
    }

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
        setActionMessage(data.error || "Failed to delete consultation.");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  const pendingReview = consultations.filter(
    (c) => c.status === "SUMMARY_GENERATED" && c.summary && !c.summary.review
  );
  const activeConsultations = consultations.filter(
    (c) => c.status === "ACTIVE"
  );
  const completedConsultations = consultations.filter(
    (c) => c.status === "COMPLETED"
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, Dr. {session?.user?.name}
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your portal and review patient consultations
        </p>
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

      {/* Portal Status */}
      {!portal ? (
        <div className="card mb-8 border-dashed border-2 border-primary-300 bg-primary-50">
          <h2 className="text-lg font-semibold text-primary-800 mb-2">
            Set Up Your Portal
          </h2>
          <p className="text-primary-700 mb-4">
            Create your medical consultation portal to start receiving patients.
            Configure the AI with your guidelines, protocols, and medical
            expertise.
          </p>
          <Link href="/doctor/portal/create" className="btn-primary">
            Create Portal
          </Link>
        </div>
      ) : (
        <div className="card mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{portal.name}</h2>
              <p className="text-gray-600">{portal.medicalField}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={
                  portal.isActive ? "badge-active" : "badge bg-gray-100 text-gray-600"
                }
              >
                {portal.isActive ? "Active" : "Inactive"}
              </span>
              <Link
                href={`/doctor/portal/${portal.id}`}
                className="btn-secondary text-sm"
              >
                Edit Portal
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="text-3xl font-bold text-yellow-600">
            {pendingReview.length}
          </div>
          <div className="text-sm text-gray-600">Pending Review</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-blue-600">
            {activeConsultations.length}
          </div>
          <div className="text-sm text-gray-600">Active Consultations</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-green-600">
            {completedConsultations.length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
      </div>

      {/* Pending Reviews */}
      {pendingReview.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-yellow-700">
            Awaiting Your Review
          </h2>
          <div className="space-y-3">
            {pendingReview.map((c) => (
              <div
                key={c.id}
                className="card flex items-center justify-between border-l-4 border-yellow-400"
              >
                <div>
                  <div className="font-medium">{c.patient.name}</div>
                  <div className="text-sm text-gray-500">
                    {c.patient.email} &middot; {c._count.messages} messages &middot;{" "}
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                    className="btn-primary text-sm"
                  >
                    Review
                  </Link>
                  <button
                    onClick={() => handleDelete(c.id, c.patient.name)}
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
        </div>
      )}

      {/* All Consultations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">All Consultations</h2>
          <Link
            href="/doctor/consultations"
            className="text-primary-600 text-sm hover:text-primary-700"
          >
            View all &rarr;
          </Link>
        </div>
        {consultations.length === 0 ? (
          <div className="card text-center text-gray-500 py-12">
            No consultations yet. Patients will appear here once they start
            consultations through your portal.
          </div>
        ) : (
          <div className="space-y-3">
            {consultations.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="card flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{c.patient.name}</div>
                  <div className="text-sm text-gray-500">
                    {c.patient.email} &middot; {c._count.messages} messages &middot;{" "}
                    {new Date(c.updatedAt).toLocaleDateString()}
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
                    onClick={() => handleDelete(c.id, c.patient.name)}
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
    </div>
  );
}
