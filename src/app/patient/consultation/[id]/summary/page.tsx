"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

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
      editedSummary: string | null;
      editedDiagnosis: string | null;
      editedWorkup: string | null;
      doctorNotes: string | null;
      reviewedAt: string;
    } | null;
  };
}

export default function PatientSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/consultation/${params.id}/summary`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (error) {
        console.error("Failed to load summary:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-gray-500">Loading summary...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center">
        <h1 className="text-xl font-bold mb-4">Summary Not Available</h1>
        <p className="text-gray-600 mb-4">
          No summary has been generated for this consultation yet.
        </p>
        <Link href="/patient/dashboard" className="btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const isReviewed = data.summary.review;
  const isCompleted = data.consultation.status === "COMPLETED";

  // Use doctor-edited versions if available, otherwise use AI originals
  const displaySummary =
    isReviewed?.editedSummary || data.summary.summary;
  const displayDiagnosis =
    isReviewed?.editedDiagnosis || data.summary.differentialDiagnosis;
  const displayWorkup =
    isReviewed?.editedWorkup || data.summary.suggestedWorkup;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Consultation Summary
          </h1>
          <p className="text-gray-600">
            Dr. {data.consultation.doctorName} &middot;{" "}
            {data.consultation.medicalField}
          </p>
        </div>
        <button
          className="btn-secondary text-sm"
          onClick={() => router.push("/patient/dashboard")}
        >
          &larr; Dashboard
        </button>
      </div>

      {/* Status Banner */}
      {isCompleted ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="font-medium text-green-800">
            Doctor Reviewed &amp; Approved
          </div>
          <div className="text-sm text-green-600 mt-1">
            Dr. {data.consultation.doctorName} has reviewed your case and
            approved the following assessment.
            {isReviewed?.reviewedAt &&
              ` Reviewed on ${new Date(isReviewed.reviewedAt).toLocaleDateString()}.`}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="font-medium text-yellow-800">
            Awaiting Doctor Review
          </div>
          <div className="text-sm text-yellow-600 mt-1">
            The AI has generated a preliminary assessment. Dr.{" "}
            {data.consultation.doctorName} will review and finalize it. You will
            be notified when the final review is available.
          </div>
        </div>
      )}

      {/* Summary Content */}
      <div className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Case Summary
          </h2>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {displaySummary}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Differential Diagnosis
          </h2>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {displayDiagnosis}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Suggested Further Workup
          </h2>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {displayWorkup}
          </div>
        </div>

        {isReviewed?.doctorNotes && (
          <div className="card border-primary-200 bg-primary-50">
            <h2 className="text-lg font-semibold text-primary-900 mb-3">
              Doctor&apos;s Notes
            </h2>
            <div className="text-sm text-primary-800 whitespace-pre-wrap leading-relaxed">
              {isReviewed.doctorNotes}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-500">
          <strong>Disclaimer:</strong> This consultation summary is provided as
          a second opinion and should not replace in-person medical evaluation.
          If you are experiencing a medical emergency, please call your local
          emergency services immediately. Always discuss the findings with your
          primary care physician before making medical decisions.
        </div>
      </div>
    </div>
  );
}
