"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState, LoadingScreen, StatCard } from "@/components/ui/States";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";

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
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [messageModal, setMessageModal] = useState<Consultation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [ratingsData, setRatingsData] = useState<{
    ratings: { id: string; rating: number; comment: string | null; createdAt: string; patient: { name: string } }[];
    average: number;
    count: number;
  } | null>(null);

  // Summary of Changes state
  const [analyzingChanges, setAnalyzingChanges] = useState(false);
  const [changesResult, setChangesResult] = useState<{
    patternSummary: string;
    instructions: string[];
    reviewedCount: number;
  } | null>(null);
  const [changesError, setChangesError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [portalRes, consRes, ratingsRes] = await Promise.all([
        fetch("/api/portal"),
        fetch("/api/consultation?as=doctor"),
        fetch("/api/doctor-rating"),
      ]);

      const portalData = await portalRes.json();
      if (portalData && portalData.id) {
        setPortal(portalData);
      }

      if (consRes.ok) {
        const consData = await consRes.json();
        setConsultations(Array.isArray(consData) ? consData : []);
      }

      if (ratingsRes.ok) {
        const ratData = await ratingsRes.json();
        setRatingsData(ratData);
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

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

  async function handleAnalyzeChanges() {
    setAnalyzingChanges(true);
    setChangesError("");
    setChangesResult(null);

    try {
      const res = await fetch("/api/doctor-profile/summary-of-changes", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setChangesResult(data);
      } else {
        const data = await res.json();
        setChangesError(data.error || "Failed to analyze changes.");
      }
    } catch {
      setChangesError("Failed to analyze changes.");
    } finally {
      setAnalyzingChanges(false);
    }
  }

  async function handleAddToPortalSettings(instructions: string[]) {
    if (!portal) return;

    try {
      // Fetch current portal data
      const portalRes = await fetch(`/api/portal`);
      if (!portalRes.ok) return;
      const portalData = await portalRes.json();

      const newInstructions = portalData.instructions
        ? `${portalData.instructions}\n\n## AI-Generated Instructions (from Summary of Changes)\n${instructions.map((i) => `- ${i}`).join("\n")}`
        : `## AI-Generated Instructions (from Summary of Changes)\n${instructions.map((i) => `- ${i}`).join("\n")}`;

      const updateRes = await fetch(`/api/portal/${portal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...portalData,
          instructions: newInstructions,
        }),
      });

      if (updateRes.ok) {
        setActionMessage("Instructions added to portal settings.");
        setTimeout(() => setActionMessage(""), 3000);
      } else {
        setActionMessage("Failed to update portal settings.");
      }
    } catch {
      setActionMessage("Failed to update portal settings.");
    }
  }

  if (loading) {
    return (
      <LoadingScreen label="Loading dashboard" />
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
    <div className="page-shell">
      <PageHeader
        title={`Welcome, Dr. ${session?.user?.name ?? ""}`}
        description="Manage your portal and review patient consultations."
        actions={
          <Link href="/doctor/profile" className="btn-secondary">
            <Icon name="settings" className="h-4 w-4" />
            Profile settings
          </Link>
        }
      />

      {/* Action Message */}
      {actionMessage && (
        <div className={`mb-4 ${actionMessage.includes("Failed") || actionMessage.includes("error") ? "alert-error" : "alert-success"}`}>
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

      {/* AI Second Opinion */}
      <div className="card mb-8 bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-purple-800">
              AI Second Opinion
            </h2>
            <p className="text-purple-600 text-sm mt-1">
              Get an AI-powered second opinion on your patient cases
            </p>
          </div>
          <Link href="/doctor/second-opinion" className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700">
            Open Console
          </Link>
        </div>
      </div>

      {/* Summary of Changes */}
      {portal && (
        <div className="card mb-8 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-emerald-800">
                Summary of Changes
              </h2>
              <p className="text-emerald-600 text-sm mt-1">
                Analyze your edits across reviewed consultations and generate AI instructions for your portal
              </p>
            </div>
            <button
              onClick={handleAnalyzeChanges}
              disabled={analyzingChanges}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {analyzingChanges ? "Analyzing..." : "Analyze Changes"}
            </button>
          </div>

          {changesError && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
              {changesError}
            </div>
          )}

          {changesResult && (
            <div className="mt-4 space-y-4">
              <div className="bg-white rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Pattern Analysis ({changesResult.reviewedCount} reviewed consultations with edits)
                </h3>
                <p className="text-sm text-gray-600">{changesResult.patternSummary}</p>
              </div>

              {changesResult.instructions.length > 0 && (
                <div className="bg-white rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Suggested Instructions for Portal
                  </h3>
                  <ul className="space-y-1.5 mb-4">
                    {changesResult.instructions.map((instruction, i) => (
                      <li key={i} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-emerald-500 flex-shrink-0">&#8226;</span>
                        {instruction}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleAddToPortalSettings(changesResult.instructions)}
                    className="btn-primary text-sm"
                  >
                    Add to Portal Settings
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Pending review"
          value={pendingReview.length}
          icon="clock"
          tone="amber"
          hint="Cases waiting on your sign-off"
        />
        <StatCard
          label="Active consultations"
          value={activeConsultations.length}
          icon="activity"
          tone="primary"
        />
        <StatCard
          label="Completed"
          value={completedConsultations.length}
          icon="check"
          tone="emerald"
        />
      </div>

      {/* Patient Ratings */}
      {ratingsData && ratingsData.count > 0 && (
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Patient Ratings</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(ratingsData.average) ? "text-yellow-400" : "text-gray-300"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {ratingsData.average.toFixed(1)} ({ratingsData.count} {ratingsData.count === 1 ? "rating" : "ratings"})
              </span>
            </div>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {ratingsData.ratings.map((r) => (
              <div key={r.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-4 h-4 ${star <= r.rating ? "text-yellow-400" : "text-gray-300"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.patient.name}</span>
                    <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-gray-600 mt-1">{r.comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <EmptyState
            icon="inbox"
            title="No consultations yet"
            description="Patients will appear here once they start consultations through your portal."
          />
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
    </div>
  );
}
