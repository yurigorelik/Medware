"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LoadingScreen } from "@/components/ui/States";

interface DocumentData {
  summaryLetter: {
    id: string;
    content: string;
    doctorName: string;
    clinicName: string | null;
    patientName: string;
    patientId: string | null;
    createdAt: string;
  } | null;
  prescriptions: {
    id: string;
    doctorName: string;
    clinicName: string | null;
    patientName: string;
    patientId: string | null;
    createdAt: string;
    items: {
      id: string;
      medicationName: string;
      dose: string | null;
      route: string | null;
      type: string | null;
      duration: string | null;
      instructions: string | null;
    }[];
  }[];
  doctorProfile: {
    stampUrl: string | null;
    signatureUrl: string | null;
    clinicName: string | null;
    specialty: string;
  };
  doctorName: string;
  patientName: string;
}

interface DocumentRequest {
  id: string;
  requestType: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

export default function PatientDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [docRequests, setDocRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestType, setRequestType] = useState("SUMMARY_LETTER");
  const [requestNotes, setRequestNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"letter" | "prescriptions">("letter");

  useEffect(() => {
    async function load() {
      try {
        const [docRes, reqRes] = await Promise.all([
          fetch(`/api/consultation/${params.id}/summary-letter`),
          fetch(`/api/consultation/${params.id}/document-request`),
        ]);

        if (docRes.ok) {
          setDocumentData(await docRes.json());
        }
        if (reqRes.ok) {
          setDocRequests(await reqRes.json());
        }
      } catch (error) {
        console.error("Failed to load documents:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  async function handleRequestDocument(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const res = await fetch(`/api/consultation/${params.id}/document-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType,
          notes: requestNotes || null,
        }),
      });

      if (res.ok) {
        const newReq = await res.json();
        setDocRequests((prev) => [newReq, ...prev]);
        setRequestNotes("");
        setMessage("Request submitted successfully. Your doctor will be notified.");
        setTimeout(() => setMessage(""), 5000);
      } else {
        const err = await res.json();
        setMessage(err.error || "Failed to submit request");
      }
    } catch {
      setMessage("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrint(elementId: string) {
    const content = document.getElementById(elementId);
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Document</title>
          <style>
            body { font-family: serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .header .name { font-size: 18px; font-weight: bold; }
            .header .clinic { color: #555; }
            .header .specialty { font-size: 14px; color: #777; }
            .header .date { font-size: 14px; color: #777; margin-top: 5px; }
            .subject { font-weight: 500; margin-bottom: 15px; }
            .content { white-space: pre-wrap; line-height: 1.6; font-size: 14px; }
            .rx-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            .rx-item { margin-bottom: 10px; font-size: 14px; }
            .rx-item .med-name { font-weight: bold; }
            .rx-item .detail { color: #555; }
            .footer { margin-top: 40px; }
            .footer img { height: auto; max-height: 80px; margin-bottom: 5px; display: block; }
            .footer .stamp { max-height: 120px; }
            .footer .doctor-name { font-weight: bold; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  if (loading) {
    return (
      <LoadingScreen label="Loading documents" />
    );
  }

  const hasLetter = !!documentData?.summaryLetter;
  const hasPrescriptions = (documentData?.prescriptions?.length || 0) > 0;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          {documentData && (
            <p className="text-gray-600">
              Dr. {documentData.doctorName}
            </p>
          )}
        </div>
        <button
          className="btn-secondary text-sm"
          onClick={() => router.push(`/patient/consultation/${params.id}/summary`)}
        >
          &larr; Summary
        </button>
      </div>

      {message && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg text-sm ${
            message.includes("success") || message.includes("submitted")
              ? "bg-green-50 text-green-600"
              : "bg-red-50 text-red-600"
          }`}
        >
          {message}
        </div>
      )}

      {/* Tabs */}
      {(hasLetter || hasPrescriptions) && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("letter")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === "letter"
                ? "bg-primary-600 text-white"
                : "bg-white text-gray-600 border border-gray-300"
            }`}
          >
            Summary Letter {hasLetter ? "" : "(Not available)"}
          </button>
          <button
            onClick={() => setTab("prescriptions")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === "prescriptions"
                ? "bg-primary-600 text-white"
                : "bg-white text-gray-600 border border-gray-300"
            }`}
          >
            Prescriptions ({documentData?.prescriptions?.length || 0})
          </button>
        </div>
      )}

      {/* Summary Letter */}
      {tab === "letter" && hasLetter && documentData && (
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Summary Letter</h2>
            <button
              onClick={() => handlePrint("summary-letter-print")}
              className="btn-secondary text-sm"
            >
              Print / Save as PDF
            </button>
          </div>

          <div className="card" id="summary-letter-print">
            <div className="header text-center mb-6">
              <div className="name text-lg font-bold">
                {documentData.summaryLetter!.doctorName}
              </div>
              {documentData.summaryLetter!.clinicName && (
                <div className="clinic text-gray-600">
                  {documentData.summaryLetter!.clinicName}
                </div>
              )}
              {documentData.doctorProfile.specialty && (
                <div className="specialty text-sm text-gray-500">
                  {documentData.doctorProfile.specialty}
                </div>
              )}
              <div className="date text-sm text-gray-500 mt-1">
                {new Date(documentData.summaryLetter!.createdAt).toLocaleDateString()}
              </div>
            </div>

            <div className="subject font-medium mb-4">
              Re: {documentData.summaryLetter!.patientName}
              {documentData.summaryLetter!.patientId && (
                <span className="text-gray-600">
                  {" "}(ID: {documentData.summaryLetter!.patientId})
                </span>
              )}
            </div>

            <div className="content text-sm whitespace-pre-wrap leading-relaxed mb-8">
              {documentData.summaryLetter!.content}
            </div>

            <div className="footer mt-8">
              {documentData.doctorProfile.signatureUrl && (
                <img
                  src={`/api${documentData.doctorProfile.signatureUrl}`}
                  alt="Signature"
                  className="h-16 mb-2"
                />
              )}
              {documentData.doctorProfile.stampUrl && (
                <img
                  src={`/api${documentData.doctorProfile.stampUrl}`}
                  alt="Stamp"
                  className="h-24 mb-2"
                />
              )}
              <div className="doctor-name font-medium">
                {documentData.summaryLetter!.doctorName}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "letter" && !hasLetter && (
        <div className="card text-center text-gray-500 py-8 mb-8">
          No summary letter has been prepared for this consultation yet.
        </div>
      )}

      {/* Prescriptions */}
      {tab === "prescriptions" && hasPrescriptions && documentData && (
        <div className="space-y-6 mb-8">
          {documentData.prescriptions.map((rx, rxIndex) => (
            <div key={rx.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Prescription {documentData.prescriptions.length > 1 ? `#${rxIndex + 1}` : ""}
                </h2>
                <button
                  onClick={() => handlePrint(`prescription-print-${rx.id}`)}
                  className="btn-secondary text-sm"
                >
                  Print / Save as PDF
                </button>
              </div>

              <div className="card" id={`prescription-print-${rx.id}`}>
                <div className="header text-center mb-6">
                  <div className="name text-lg font-bold">{rx.doctorName}</div>
                  {rx.clinicName && (
                    <div className="clinic text-gray-600">{rx.clinicName}</div>
                  )}
                  {documentData.doctorProfile.specialty && (
                    <div className="specialty text-sm text-gray-500">
                      {documentData.doctorProfile.specialty}
                    </div>
                  )}
                  <div className="date text-sm text-gray-500 mt-1">
                    {new Date(rx.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="rx-title text-lg font-bold mb-2">PRESCRIPTION</div>
                <div className="subject font-medium mb-4">
                  Patient: {rx.patientName}
                  {rx.patientId && (
                    <span className="text-gray-600"> (ID: {rx.patientId})</span>
                  )}
                </div>

                <div className="border-t pt-4 space-y-3">
                  {rx.items.map((item, i) => (
                    <div key={item.id} className="rx-item flex gap-2">
                      <span className="font-medium text-sm">{i + 1}.</span>
                      <div className="text-sm">
                        <span className="med-name font-medium">{item.medicationName}</span>
                        {item.dose && <span> — {item.dose}</span>}
                        {item.route && <span> ({item.route})</span>}
                        {item.type && <span> [{item.type}]</span>}
                        {item.duration && (
                          <div className="detail text-gray-600">Duration: {item.duration}</div>
                        )}
                        {item.instructions && (
                          <div className="detail text-gray-600">Instructions: {item.instructions}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="footer mt-8">
                  {documentData.doctorProfile.signatureUrl && (
                    <img
                      src={`/api${documentData.doctorProfile.signatureUrl}`}
                      alt="Signature"
                      className="h-16 mb-2"
                    />
                  )}
                  {documentData.doctorProfile.stampUrl && (
                    <img
                      src={`/api${documentData.doctorProfile.stampUrl}`}
                      alt="Stamp"
                      className="h-24 mb-2"
                    />
                  )}
                  <div className="doctor-name font-medium">{rx.doctorName}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "prescriptions" && !hasPrescriptions && (
        <div className="card text-center text-gray-500 py-8 mb-8">
          No prescriptions have been prepared for this consultation yet.
        </div>
      )}

      {/* Request a Document */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Request a Document</h2>
        <p className="text-sm text-gray-600 mb-4">
          If you need a summary letter or prescription from your doctor, you can submit a request here.
        </p>

        {/* Show existing requests */}
        {docRequests.length > 0 && (
          <div className="mb-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Your Requests</h3>
            {docRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="text-sm">
                  {req.requestType === "SUMMARY_LETTER" ? "Summary Letter" : "Prescription"}
                  {req.notes && <span className="text-gray-500"> — {req.notes}</span>}
                </div>
                <span
                  className={`badge ${
                    req.status === "PENDING"
                      ? "bg-yellow-100 text-yellow-800"
                      : req.status === "COMPLETED"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleRequestDocument} className="space-y-3">
          <div>
            <label className="label">Document Type</label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              className="input-field max-w-xs"
            >
              <option value="SUMMARY_LETTER">Summary Letter</option>
              <option value="PRESCRIPTION">Prescription</option>
            </select>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <input
              type="text"
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              className="input-field"
              placeholder="Any additional details for the doctor..."
            />
          </div>
          <button
            type="submit"
            className="btn-primary text-sm"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
