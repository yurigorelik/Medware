"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface SummaryData {
  consultation: {
    id: string;
    status: string;
    patientName: string;
    doctorName: string;
    medicalField: string;
    createdAt: string;
  };
  summary: {
    id: string;
    summary: string;
    differentialDiagnosis: string;
    suggestedWorkup: string;
    createdAt: string;
    review: {
      id: string;
      approved: boolean;
      followUpRequested: boolean;
      editedSummary: string | null;
      editedDiagnosis: string | null;
      editedWorkup: string | null;
      doctorNotes: string | null;
      reviewedAt: string;
    } | null;
  };
}

export default function DoctorConsultationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"chat" | "summary">("summary");

  // Review form
  const [editedSummary, setEditedSummary] = useState("");
  const [editedDiagnosis, setEditedDiagnosis] = useState("");
  const [editedWorkup, setEditedWorkup] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [msgsRes, sumRes] = await Promise.all([
          fetch(`/api/consultation/${params.id}/messages`),
          fetch(`/api/consultation/${params.id}/summary`),
        ]);

        if (msgsRes.ok) {
          setMessages(await msgsRes.json());
        }

        if (sumRes.ok) {
          const data = await sumRes.json();
          setSummaryData(data);
          // Pre-fill review form with AI summary
          setEditedSummary(data.summary.summary);
          setEditedDiagnosis(data.summary.differentialDiagnosis);
          setEditedWorkup(data.summary.suggestedWorkup);
        }
      } catch (error) {
        console.error("Failed to load consultation:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [params.id]);

  async function handleApprove(approve: boolean, followUp: boolean = false) {
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/consultation/${params.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved: approve,
          followUpRequested: followUp,
          editedSummary:
            editedSummary !== summaryData?.summary.summary
              ? editedSummary
              : null,
          editedDiagnosis:
            editedDiagnosis !== summaryData?.summary.differentialDiagnosis
              ? editedDiagnosis
              : null,
          editedWorkup:
            editedWorkup !== summaryData?.summary.suggestedWorkup
              ? editedWorkup
              : null,
          doctorNotes: doctorNotes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit review");
        return;
      }

      router.push("/doctor/consultations");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-gray-500">Loading consultation...</div>
      </div>
    );
  }

  const isReviewed = summaryData?.summary?.review;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Consultation Review
          </h1>
          {summaryData && (
            <p className="text-gray-600">
              Patient: {summaryData.consultation.patientName} &middot;{" "}
              {summaryData.consultation.medicalField}
            </p>
          )}
        </div>
        <button
          className="btn-secondary text-sm"
          onClick={() => router.push("/doctor/consultations")}
        >
          &larr; Back
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("summary")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === "summary"
              ? "bg-primary-600 text-white"
              : "bg-white text-gray-600 border border-gray-300"
          }`}
        >
          Case Summary
        </button>
        <button
          onClick={() => setTab("chat")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === "chat"
              ? "bg-primary-600 text-white"
              : "bg-white text-gray-600 border border-gray-300"
          }`}
        >
          Chat History ({messages.length})
        </button>
      </div>

      {tab === "chat" ? (
        <div className="card max-h-[600px] overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-lg ${
                msg.role === "USER"
                  ? "bg-blue-50 ml-8"
                  : "bg-gray-50 mr-8"
              }`}
            >
              <div className="text-xs font-medium text-gray-500 mb-1">
                {msg.role === "USER" ? "Patient" : "AI Assistant"} &middot;{" "}
                {new Date(msg.createdAt).toLocaleTimeString()}
              </div>
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))}
        </div>
      ) : summaryData ? (
        <div className="space-y-6">
          {isReviewed ? (
            /* Already reviewed - show read-only */
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="text-green-700 font-medium">
                    This consultation has been reviewed and{" "}
                    {summaryData.summary.review!.approved
                      ? "approved"
                      : "reviewed with modifications"}
                    {summaryData.summary.review!.followUpRequested &&
                      " — Follow-up requested"}
                  </div>
                  <div className="text-sm text-green-600 mt-1">
                    Reviewed on{" "}
                    {new Date(
                      summaryData.summary.review!.reviewedAt
                    ).toLocaleDateString()}
                  </div>
                </div>
                <Link
                  href={`/doctor/consultations/${params.id}/documents`}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 flex-shrink-0"
                >
                  Prepare Documents
                </Link>
              </div>

              <div className="card">
                <h3 className="font-semibold mb-2">Case Summary</h3>
                <div className="text-sm whitespace-pre-wrap text-gray-700">
                  {summaryData.summary.review!.editedSummary ||
                    summaryData.summary.summary}
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold mb-2">Differential Diagnosis</h3>
                <div className="text-sm whitespace-pre-wrap text-gray-700">
                  {summaryData.summary.review!.editedDiagnosis ||
                    summaryData.summary.differentialDiagnosis}
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold mb-2">Suggested Workup</h3>
                <div className="text-sm whitespace-pre-wrap text-gray-700">
                  {summaryData.summary.review!.editedWorkup ||
                    summaryData.summary.suggestedWorkup}
                </div>
              </div>

              {summaryData.summary.review!.doctorNotes && (
                <div className="card border-primary-200 bg-primary-50">
                  <h3 className="font-semibold mb-2 text-primary-800">
                    Doctor&apos;s Notes
                  </h3>
                  <div className="text-sm whitespace-pre-wrap text-primary-700">
                    {summaryData.summary.review!.doctorNotes}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Review form */
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-yellow-700 font-medium">
                  This consultation is awaiting your review
                </div>
                <div className="text-sm text-yellow-600 mt-1">
                  You can approve the AI-generated summary as-is, or edit any
                  section before approving.
                </div>
              </div>

              <div className="card space-y-2">
                <h3 className="font-semibold">Case Summary</h3>
                <p className="text-xs text-gray-500">
                  Edit if needed, or approve as-is
                </p>
                <textarea
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  className="textarea-field"
                  rows={8}
                />
              </div>

              <div className="card space-y-2">
                <h3 className="font-semibold">Differential Diagnosis</h3>
                <textarea
                  value={editedDiagnosis}
                  onChange={(e) => setEditedDiagnosis(e.target.value)}
                  className="textarea-field"
                  rows={6}
                />
              </div>

              <div className="card space-y-2">
                <h3 className="font-semibold">Suggested Workup</h3>
                <textarea
                  value={editedWorkup}
                  onChange={(e) => setEditedWorkup(e.target.value)}
                  className="textarea-field"
                  rows={6}
                />
              </div>

              <div className="card space-y-2">
                <h3 className="font-semibold">Your Notes to the Patient</h3>
                <p className="text-xs text-gray-500">
                  Optional additional notes or comments for the patient
                </p>
                <textarea
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  className="textarea-field"
                  rows={4}
                  placeholder="Any additional notes, recommendations, or comments..."
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleApprove(true, false)}
                  className="btn-success"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Approve & Send to Patient"}
                </button>
                <button
                  onClick={() => handleApprove(true, true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                  disabled={submitting}
                  title="Approve and ask the patient to return for a follow-up consultation"
                >
                  {submitting ? "Submitting..." : "Approve & Request Follow-Up"}
                </button>
                <button
                  onClick={() => setTab("chat")}
                  className="btn-secondary"
                >
                  Review Chat History
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center text-gray-500 py-12">
          No summary has been generated yet for this consultation.
          <br />
          <button
            onClick={() => setTab("chat")}
            className="text-primary-600 hover:text-primary-700 mt-2 text-sm"
          >
            View chat history
          </button>
        </div>
      )}
    </div>
  );
}
