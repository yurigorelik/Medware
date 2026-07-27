"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoadingScreen } from "@/components/ui/States";
import PageHeader from "@/components/ui/PageHeader";

interface DoctorOption {
  id: string;
  name: string;
  email: string;
  specialty: string | null;
  bio: string | null;
}

export default function NewVisitPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"PATIENT" | "DOCTOR">("PATIENT");
  const [canActAsDoctor, setCanActAsDoctor] = useState(false);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [doctorId, setDoctorId] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [reason, setReason] = useState("");
  const [modality, setModality] = useState<"IN_PERSON" | "VIDEO">("IN_PERSON");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [doctorsRes, modeRes] = await Promise.all([
          fetch("/api/visits/doctors"),
          fetch("/api/visits/doctor-mode"),
        ]);
        if (doctorsRes.ok) {
          const data = await doctorsRes.json();
          setDoctors(Array.isArray(data) ? data : []);
        }
        if (modeRes.ok) {
          const m = await modeRes.json();
          setCanActAsDoctor(!!m?.isDoctor);
        }
      } catch (err) {
        console.error("Failed to load request form:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "PATIENT" && !doctorId) {
      setError("Please choose a doctor.");
      return;
    }
    if (mode === "DOCTOR" && !patientEmail.trim()) {
      setError("Please enter the patient's email.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: mode,
          doctorId: mode === "PATIENT" ? doctorId : undefined,
          patientEmail: mode === "DOCTOR" ? patientEmail.trim() : undefined,
          reason: reason.trim() || undefined,
          modality,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create the request.");
        setSubmitting(false);
        return;
      }
      router.push(`/visits/${data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <LoadingScreen label="Loading" />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        breadcrumbs={[{ label: "Visits", href: "/visits" }, { label: "Request a visit" }]}
        title="Request a visit"
        description="Pick a doctor, choose a modality, and propose a time."
      />

      {canActAsDoctor && (
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode("PATIENT")}
            className={
              mode === "PATIENT"
                ? "btn-primary text-sm"
                : "btn-secondary text-sm"
            }
          >
            I&apos;m the patient
          </button>
          <button
            type="button"
            onClick={() => setMode("DOCTOR")}
            className={
              mode === "DOCTOR" ? "btn-primary text-sm" : "btn-secondary text-sm"
            }
          >
            Invite a patient
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5">
        {mode === "PATIENT" ? (
          <div>
            <label className="label">Doctor</label>
            {doctors.length === 0 ? (
              <p className="text-sm text-gray-500">
                No doctors are available to book right now.
              </p>
            ) : (
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="input-field"
              >
                <option value="">Select a doctor...</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.name}
                    {d.specialty ? ` — ${d.specialty}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <div>
            <label className="label">Patient email</label>
            <input
              type="email"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              placeholder="patient@example.com"
              className="input-field"
            />
            <p className="text-xs text-gray-400 mt-1">
              The patient must already have a MedWare account.
            </p>
          </div>
        )}

        <div>
          <label className="label">Reason / notes (optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="textarea-field"
            placeholder="Briefly describe what the visit is about..."
          />
        </div>

        <div>
          <label className="label">Preferred modality</label>
          <select
            value={modality}
            onChange={(e) =>
              setModality(e.target.value as "IN_PERSON" | "VIDEO")
            }
            className="input-field"
          >
            <option value="IN_PERSON">In-person</option>
            <option value="VIDEO">Video</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            The doctor confirms the final modality when accepting.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Link href="/visits" className="btn-secondary text-sm">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn-primary text-sm"
            disabled={submitting}
          >
            {submitting ? "Sending..." : "Send request"}
          </button>
        </div>
      </form>
    </div>
  );
}
