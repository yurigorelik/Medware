"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/ui/States";

interface SummaryData {
  consultation: {
    id: string;
    status: string;
    patientName: string;
    doctorName: string;
    medicalField: string;
  };
  summary: {
    summary: string;
    differentialDiagnosis: string;
    suggestedWorkup: string;
    review: {
      editedSummary: string | null;
      editedDiagnosis: string | null;
      editedWorkup: string | null;
      doctorNotes: string | null;
    } | null;
  };
}

interface ExtractedMedication {
  name: string;
  suggestedDose?: string;
  suggestedRoute?: string;
  suggestedDuration?: string;
  reason?: string;
}

interface PrescriptionItem {
  medicationName: string;
  dose: string;
  route: string;
  type: string;
  duration: string;
  instructions: string;
  selected: boolean;
}

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

export default function DoctorDocumentsPage() {
  const params = useParams();
  const router = useRouter();

  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [docRequests, setDocRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Summary letter form
  const [letterContent, setLetterContent] = useState("");
  const [patientIdNumber, setPatientIdNumber] = useState("");
  const [savingLetter, setSavingLetter] = useState(false);

  // Medication extraction
  const [extracting, setExtracting] = useState(false);
  const [extractedMeds, setExtractedMeds] = useState<ExtractedMedication[]>([]);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [showPrescription, setShowPrescription] = useState(false);
  const [savingPrescription, setSavingPrescription] = useState(false);

  // Tab
  const [tab, setTab] = useState<"letter" | "prescription" | "requests">("letter");

  useEffect(() => {
    async function load() {
      try {
        const [sumRes, docRes, reqRes] = await Promise.all([
          fetch(`/api/consultation/${params.id}/summary`),
          fetch(`/api/consultation/${params.id}/summary-letter`),
          fetch(`/api/consultation/${params.id}/document-request`),
        ]);

        if (sumRes.ok) {
          const data = await sumRes.json();
          setSummaryData(data);
          // Pre-fill letter content with the reviewed summary
          const review = data.summary.review;
          const summaryText = review?.editedSummary || data.summary.summary;
          const diagnosisText = review?.editedDiagnosis || data.summary.differentialDiagnosis;
          const workupText = review?.editedWorkup || data.summary.suggestedWorkup;
          const notesText = review?.doctorNotes || "";

          let content = `${summaryText}`;
          content += `\n\nDifferential Diagnosis:\n${diagnosisText}`;
          content += `\n\nSuggested Workup:\n${workupText}`;
          if (notesText) {
            content += `\n\nDoctor's Notes:\n${notesText}`;
          }
          setLetterContent(content);
        }

        if (docRes.ok) {
          setDocumentData(await docRes.json());
        }

        if (reqRes.ok) {
          setDocRequests(await reqRes.json());
        }
      } catch (err) {
        console.error("Failed to load:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  async function handleExtractMedications() {
    setExtracting(true);
    setError("");
    try {
      const res = await fetch(`/api/consultation/${params.id}/extract-medications`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setExtractedMeds(data.medications);
        setPrescriptionItems(
          data.medications.map((med: ExtractedMedication) => ({
            medicationName: med.name,
            dose: med.suggestedDose || "",
            route: med.suggestedRoute || "oral",
            type: "",
            duration: med.suggestedDuration || "",
            instructions: "",
            selected: true,
          }))
        );
        setShowPrescription(true);
        setTab("prescription");
      } else {
        const err = await res.json();
        setError(err.error || "Failed to extract medications");
      }
    } catch {
      setError("Failed to extract medications");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSaveLetter() {
    setSavingLetter(true);
    setError("");
    try {
      const res = await fetch(`/api/consultation/${params.id}/summary-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: letterContent,
          patientIdNumber,
        }),
      });
      if (res.ok) {
        setSuccessMsg("Summary letter created successfully.");
        setTimeout(() => setSuccessMsg(""), 3000);
        // Reload document data
        const docRes = await fetch(`/api/consultation/${params.id}/summary-letter`);
        if (docRes.ok) setDocumentData(await docRes.json());
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create summary letter");
      }
    } catch {
      setError("Failed to create summary letter");
    } finally {
      setSavingLetter(false);
    }
  }

  async function handleSavePrescription() {
    setSavingPrescription(true);
    setError("");
    const selectedItems = prescriptionItems.filter((i) => i.selected);
    if (selectedItems.length === 0) {
      setError("Please select at least one medication");
      setSavingPrescription(false);
      return;
    }

    try {
      const res = await fetch(`/api/consultation/${params.id}/prescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selectedItems.map((i) => ({
            medicationName: i.medicationName,
            dose: i.dose || null,
            route: i.route || null,
            type: i.type || null,
            duration: i.duration || null,
            instructions: i.instructions || null,
          })),
          patientIdNumber,
        }),
      });
      if (res.ok) {
        setSuccessMsg("Prescription created successfully.");
        setShowPrescription(false);
        setTimeout(() => setSuccessMsg(""), 3000);
        // Reload document data
        const docRes = await fetch(`/api/consultation/${params.id}/summary-letter`);
        if (docRes.ok) setDocumentData(await docRes.json());
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create prescription");
      }
    } catch {
      setError("Failed to create prescription");
    } finally {
      setSavingPrescription(false);
    }
  }

  function updatePrescriptionItem(index: number, field: string, value: string | boolean) {
    setPrescriptionItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  function addPrescriptionItem() {
    setPrescriptionItems((prev) => [
      ...prev,
      {
        medicationName: "",
        dose: "",
        route: "oral",
        type: "",
        duration: "",
        instructions: "",
        selected: true,
      },
    ]);
  }

  function removePrescriptionItem(index: number) {
    setPrescriptionItems((prev) => prev.filter((_, i) => i !== index));
  }

  if (loading) {
    return (
      <LoadingScreen label="Loading" />
    );
  }

  if (!summaryData) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center">
        <h1 className="text-xl font-bold mb-4">No Summary Available</h1>
        <p className="text-gray-600 mb-4">
          A case summary must be generated and reviewed before documents can be prepared.
        </p>
        <button
          className="btn-secondary"
          onClick={() => router.push(`/doctor/consultations/${params.id}`)}
        >
          Back to Consultation
        </button>
      </div>
    );
  }

  const hasExistingLetter = !!documentData?.summaryLetter;
  const hasExistingPrescriptions = (documentData?.prescriptions?.length || 0) > 0;
  const pendingRequests = docRequests.filter((r) => r.status === "PENDING");

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Prepare Documents
          </h1>
          <p className="text-gray-600">
            Patient: {summaryData.consultation.patientName} &middot;{" "}
            {summaryData.consultation.medicalField}
          </p>
        </div>
        <button
          className="btn-secondary text-sm"
          onClick={() => router.push(`/doctor/consultations/${params.id}`)}
        >
          &larr; Back
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg mb-6 text-sm">
          {successMsg}
        </div>
      )}

      {/* Pending document requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="font-medium text-amber-800 mb-2">
            Patient Document Requests
          </div>
          {pendingRequests.map((req) => (
            <div key={req.id} className="text-sm text-amber-700 mb-1">
              Request for {req.requestType === "SUMMARY_LETTER" ? "Summary Letter" : "Prescription"}
              {req.notes && ` — "${req.notes}"`}
              {" "}({new Date(req.createdAt).toLocaleDateString()})
            </div>
          ))}
        </div>
      )}

      {/* Patient ID */}
      <div className="card mb-6">
        <label className="label">Patient ID Number (optional)</label>
        <input
          type="text"
          value={patientIdNumber}
          onChange={(e) => setPatientIdNumber(e.target.value)}
          className="input-field max-w-sm"
          placeholder="e.g. National ID, passport number"
        />
        <p className="text-xs text-gray-500 mt-1">
          If provided, this will appear on the summary letter and prescription
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("letter")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === "letter"
              ? "bg-primary-600 text-white"
              : "bg-white text-gray-600 border border-gray-300"
          }`}
        >
          Summary Letter
        </button>
        <button
          onClick={() => setTab("prescription")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === "prescription"
              ? "bg-primary-600 text-white"
              : "bg-white text-gray-600 border border-gray-300"
          }`}
        >
          Prescription
        </button>
        {docRequests.length > 0 && (
          <button
            onClick={() => setTab("requests")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === "requests"
                ? "bg-primary-600 text-white"
                : "bg-white text-gray-600 border border-gray-300"
            }`}
          >
            Requests ({pendingRequests.length} pending)
          </button>
        )}
      </div>

      {tab === "letter" && (
        <div className="space-y-6">
          {hasExistingLetter ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-green-700 font-medium">
                  Summary letter has been created
                </div>
                <div className="text-sm text-green-600 mt-1">
                  Created on {new Date(documentData!.summaryLetter!.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Preview */}
              <div className="card">
                <h3 className="font-semibold mb-4">Letter Preview</h3>
                <div className="border border-gray-200 rounded-lg p-8 bg-white">
                  <div className="text-center mb-6">
                    <div className="text-lg font-bold">{documentData!.summaryLetter!.doctorName}</div>
                    {documentData!.summaryLetter!.clinicName && (
                      <div className="text-gray-600">{documentData!.summaryLetter!.clinicName}</div>
                    )}
                    {documentData!.doctorProfile.specialty && (
                      <div className="text-sm text-gray-500">{documentData!.doctorProfile.specialty}</div>
                    )}
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(documentData!.summaryLetter!.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="font-medium">
                      Re: {documentData!.summaryLetter!.patientName}
                      {documentData!.summaryLetter!.patientId && (
                        <span className="text-gray-600"> (ID: {documentData!.summaryLetter!.patientId})</span>
                      )}
                    </div>
                  </div>

                  <div className="text-sm whitespace-pre-wrap leading-relaxed mb-8">
                    {documentData!.summaryLetter!.content}
                  </div>

                  <div className="mt-8">
                    {documentData!.doctorProfile.signatureUrl && (
                      <img
                        src={`/api${documentData!.doctorProfile.signatureUrl}`}
                        alt="Signature"
                        className="h-16 mb-2"
                      />
                    )}
                    {documentData!.doctorProfile.stampUrl && (
                      <img
                        src={`/api${documentData!.doctorProfile.stampUrl}`}
                        alt="Stamp"
                        className="h-24 mb-2"
                      />
                    )}
                    <div className="font-medium">{documentData!.summaryLetter!.doctorName}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="card space-y-2">
                <h3 className="font-semibold">Summary Letter Content</h3>
                <p className="text-xs text-gray-500">
                  Edit the letter content below. The header (your name, clinic, date) and footer (signature, stamp) will be added automatically.
                </p>
                <textarea
                  value={letterContent}
                  onChange={(e) => setLetterContent(e.target.value)}
                  className="textarea-field"
                  rows={16}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveLetter}
                  className="btn-primary"
                  disabled={savingLetter || !letterContent.trim()}
                >
                  {savingLetter ? "Creating..." : "Create Summary Letter"}
                </button>
                <button
                  onClick={handleExtractMedications}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                  disabled={extracting}
                >
                  {extracting ? "Extracting..." : "Extract Medications for Prescription"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "prescription" && (
        <div className="space-y-6">
          {/* Existing prescriptions */}
          {hasExistingPrescriptions && (
            <div className="space-y-4">
              {documentData!.prescriptions.map((rx) => (
                <div key={rx.id} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">
                      Prescription — {new Date(rx.createdAt).toLocaleDateString()}
                    </h3>
                    <span className="badge bg-green-100 text-green-800">Created</span>
                  </div>

                  {/* Prescription preview */}
                  <div className="border border-gray-200 rounded-lg p-8 bg-white">
                    <div className="text-center mb-6">
                      <div className="text-lg font-bold">{rx.doctorName}</div>
                      {rx.clinicName && (
                        <div className="text-gray-600">{rx.clinicName}</div>
                      )}
                      {documentData!.doctorProfile.specialty && (
                        <div className="text-sm text-gray-500">{documentData!.doctorProfile.specialty}</div>
                      )}
                      <div className="text-sm text-gray-500 mt-1">
                        {new Date(rx.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="font-medium text-lg">PRESCRIPTION</div>
                      <div className="font-medium mt-2">
                        Patient: {rx.patientName}
                        {rx.patientId && (
                          <span className="text-gray-600"> (ID: {rx.patientId})</span>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      {rx.items.map((item, i) => (
                        <div key={item.id} className="flex gap-2">
                          <span className="font-medium text-sm">{i + 1}.</span>
                          <div className="text-sm">
                            <span className="font-medium">{item.medicationName}</span>
                            {item.dose && <span> — {item.dose}</span>}
                            {item.route && <span> ({item.route})</span>}
                            {item.type && <span> [{item.type}]</span>}
                            {item.duration && (
                              <div className="text-gray-600">Duration: {item.duration}</div>
                            )}
                            {item.instructions && (
                              <div className="text-gray-600">Instructions: {item.instructions}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8">
                      {documentData!.doctorProfile.signatureUrl && (
                        <img
                          src={`/api${documentData!.doctorProfile.signatureUrl}`}
                          alt="Signature"
                          className="h-16 mb-2"
                        />
                      )}
                      {documentData!.doctorProfile.stampUrl && (
                        <img
                          src={`/api${documentData!.doctorProfile.stampUrl}`}
                          alt="Stamp"
                          className="h-24 mb-2"
                        />
                      )}
                      <div className="font-medium">{rx.doctorName}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create new prescription */}
          {showPrescription && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-purple-700 font-medium">
                  {extractedMeds.length} medication(s) identified
                </div>
                <div className="text-sm text-purple-600 mt-1">
                  Select which medications to include and customize the prescription details.
                </div>
              </div>

              {prescriptionItems.map((item, index) => (
                <div key={index} className="card">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) =>
                        updatePrescriptionItem(index, "selected", e.target.checked)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="label">Medication Name</label>
                          <input
                            type="text"
                            value={item.medicationName}
                            onChange={(e) =>
                              updatePrescriptionItem(index, "medicationName", e.target.value)
                            }
                            className="input-field"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removePrescriptionItem(index)}
                          className="mt-6 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          title="Remove"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {extractedMeds[index]?.reason && (
                        <p className="text-xs text-gray-500">
                          Reason: {extractedMeds[index].reason}
                        </p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="label">Dose</label>
                          <input
                            type="text"
                            value={item.dose}
                            onChange={(e) =>
                              updatePrescriptionItem(index, "dose", e.target.value)
                            }
                            className="input-field"
                            placeholder="e.g. 500mg"
                          />
                        </div>
                        <div>
                          <label className="label">Route</label>
                          <select
                            value={item.route}
                            onChange={(e) =>
                              updatePrescriptionItem(index, "route", e.target.value)
                            }
                            className="input-field"
                          >
                            <option value="oral">Oral</option>
                            <option value="IV">IV</option>
                            <option value="IM">IM</option>
                            <option value="SC">SC</option>
                            <option value="topical">Topical</option>
                            <option value="inhaled">Inhaled</option>
                            <option value="sublingual">Sublingual</option>
                            <option value="rectal">Rectal</option>
                            <option value="nasal">Nasal</option>
                            <option value="ophthalmic">Ophthalmic</option>
                            <option value="otic">Otic</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">Type</label>
                          <input
                            type="text"
                            value={item.type}
                            onChange={(e) =>
                              updatePrescriptionItem(index, "type", e.target.value)
                            }
                            className="input-field"
                            placeholder="e.g. tablet, capsule"
                          />
                        </div>
                        <div>
                          <label className="label">Duration</label>
                          <input
                            type="text"
                            value={item.duration}
                            onChange={(e) =>
                              updatePrescriptionItem(index, "duration", e.target.value)
                            }
                            className="input-field"
                            placeholder="e.g. 7 days"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label">Instructions</label>
                        <input
                          type="text"
                          value={item.instructions}
                          onChange={(e) =>
                            updatePrescriptionItem(index, "instructions", e.target.value)
                          }
                          className="input-field"
                          placeholder="e.g. Take with food, twice daily"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addPrescriptionItem}
                className="btn-secondary text-sm"
              >
                + Add Medication
              </button>

              <div className="flex gap-3">
                <button
                  onClick={handleSavePrescription}
                  className="btn-primary"
                  disabled={savingPrescription}
                >
                  {savingPrescription ? "Creating..." : "Create Prescription"}
                </button>
                <button
                  onClick={() => setShowPrescription(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!showPrescription && (
            <div className="flex gap-3">
              <button
                onClick={handleExtractMedications}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                disabled={extracting}
              >
                {extracting ? "Extracting..." : "Extract Medications & Create New Prescription"}
              </button>
              <button
                onClick={() => {
                  setPrescriptionItems([
                    {
                      medicationName: "",
                      dose: "",
                      route: "oral",
                      type: "",
                      duration: "",
                      instructions: "",
                      selected: true,
                    },
                  ]);
                  setShowPrescription(true);
                }}
                className="btn-secondary text-sm"
              >
                Create Manual Prescription
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "requests" && (
        <div className="space-y-4">
          {docRequests.length === 0 ? (
            <div className="card text-center text-gray-500 py-8">
              No document requests from the patient.
            </div>
          ) : (
            docRequests.map((req) => (
              <div
                key={req.id}
                className={`card flex items-center justify-between ${
                  req.status === "PENDING" ? "border-l-4 border-amber-400" : ""
                }`}
              >
                <div>
                  <div className="font-medium">
                    {req.requestType === "SUMMARY_LETTER" ? "Summary Letter" : "Prescription"}
                  </div>
                  {req.notes && (
                    <div className="text-sm text-gray-600 mt-1">Note: {req.notes}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </div>
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
            ))
          )}
        </div>
      )}
    </div>
  );
}
