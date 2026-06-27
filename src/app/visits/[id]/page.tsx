"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { statusBadgeClass, statusLabel, formatCost } from "@/lib/visitFormat";

interface Slot {
  id: string;
  start: string;
  end: string;
  booked: boolean;
  visitId: string | null;
}

interface VisitDetail {
  id: string;
  patientId: string;
  doctorId: string;
  requestedBy: string;
  status: string;
  reason: string | null;
  modality: string;
  meetingLink: string | null;
  location: string | null;
  costCents: number | null;
  currency: string;
  terms: string | null;
  slotSource: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  cancelledBy: string | null;
  patient: { id: string; name: string; email: string };
  doctor: { id: string; name: string; email: string; specialty: string | null; bio: string | null };
  scheduledSlot: Slot | null;
  customSlots: Slot[];
  availableSlots: Slot[];
  viewerRole: "PATIENT" | "DOCTOR" | "ADMIN";
}

function fmtRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleString()} – ${e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

// A datetime-local value (no offset) is parsed as local time by the Date
// constructor, so toISOString() yields the correct UTC instant directly.
function toIso(localValue: string): string {
  return new Date(localValue).toISOString();
}

export default function VisitDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/visits/${params.id}`);
      if (res.status === 404 || res.status === 403) {
        setNotFound(true);
        return;
      }
      if (res.ok) {
        setVisit(await res.json());
      }
    } catch (err) {
      console.error("Failed to load visit:", err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = useCallback(
    async (path: string, body?: unknown): Promise<boolean> => {
      setWorking(true);
      setError("");
      try {
        const res = await fetch(`/api/visits/${params.id}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Action failed.");
          setWorking(false);
          return false;
        }
        await load();
        router.refresh();
        setWorking(false);
        return true;
      } catch {
        setError("Something went wrong. Please try again.");
        setWorking(false);
        return false;
      }
    },
    [params.id, load, router]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-gray-500">Loading visit...</div>
      </div>
    );
  }

  if (notFound || !visit) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Visit not available
        </h1>
        <p className="text-gray-500 mb-6">
          This visit doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link href="/visits" className="btn-primary text-sm">
          Back to visits
        </Link>
      </div>
    );
  }

  const viewerRole = visit.viewerRole;
  const isDoctor = viewerRole === "DOCTOR";
  const isPatient = viewerRole === "PATIENT";
  const other = isDoctor ? visit.patient : visit.doctor;
  const otherLabel = isDoctor
    ? other.name
    : `Dr. ${visit.doctor.name}${visit.doctor.specialty ? ` · ${visit.doctor.specialty}` : ""}`;

  const canCancel = ["REQUESTED", "ACCEPTED", "BOOKED"].includes(visit.status);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/visits" className="text-sm text-primary-600 hover:text-primary-700">
        &larr; Back to visits
      </Link>

      <div className="flex items-start justify-between gap-4 mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{otherLabel}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isDoctor ? "Patient" : "Doctor"} · {other.email}
          </p>
        </div>
        <span className={statusBadgeClass(visit.status)}>
          {statusLabel(visit.status)}
        </span>
      </div>

      {/* Summary */}
      <div className="card space-y-3 mb-6">
        <Detail label="Modality">
          {visit.modality === "VIDEO" ? "Video" : "In-person"}
        </Detail>
        {visit.reason && <Detail label="Reason">{visit.reason}</Detail>}
        {visit.costCents != null && (
          <Detail label="Cost">{formatCost(visit.costCents, visit.currency)}</Detail>
        )}
        {visit.scheduledStart && visit.scheduledEnd && (
          <Detail label="Scheduled">
            {fmtRange(visit.scheduledStart, visit.scheduledEnd)}
          </Detail>
        )}
        {visit.status === "BOOKED" || visit.status === "COMPLETED" ? (
          <>
            {visit.modality === "VIDEO" && visit.meetingLink && (
              <Detail label="Meeting link">
                <a
                  href={visit.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 break-all"
                >
                  {visit.meetingLink}
                </a>
              </Detail>
            )}
            {visit.modality === "IN_PERSON" && visit.location && (
              <Detail label="Location">{visit.location}</Detail>
            )}
          </>
        ) : null}
        {visit.terms && <Detail label="Terms">{visit.terms}</Detail>}
        {visit.status === "CANCELLED" && visit.cancelledBy && (
          <Detail label="Cancelled by">
            {visit.cancelledBy === "PATIENT" ? "Patient" : "Doctor"}
          </Detail>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-600">
          {error}
        </div>
      )}

      {/* Doctor: accept a request */}
      {isDoctor && visit.status === "REQUESTED" && (
        <AcceptForm visit={visit} working={working} runAction={runAction} />
      )}

      {/* Doctor: waiting for patient to book */}
      {isDoctor && visit.status === "ACCEPTED" && (
        <div className="card mb-6">
          <p className="text-sm text-gray-600">
            Waiting for the patient to choose a slot and book.
            {visit.slotSource === "EXISTING"
              ? " They can pick from your standing availability."
              : " You offered specific slots for this visit."}
          </p>
        </div>
      )}

      {/* Doctor: complete a booked visit */}
      {isDoctor && visit.status === "BOOKED" && (
        <div className="card mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mark this visit as completed once it has taken place.
          </p>
          <button
            onClick={() => runAction("/complete")}
            disabled={working}
            className="btn-success text-sm"
          >
            Mark completed
          </button>
        </div>
      )}

      {/* Patient: waiting for doctor */}
      {isPatient && visit.status === "REQUESTED" && (
        <div className="card mb-6">
          <p className="text-sm text-gray-600">
            Your request was sent. You&apos;ll be able to choose a slot once the
            doctor accepts and sets the cost.
          </p>
        </div>
      )}

      {/* Patient: book a slot */}
      {isPatient && visit.status === "ACCEPTED" && (
        <BookForm visit={visit} working={working} runAction={runAction} />
      )}

      {/* Confirmation for booked/completed */}
      {(visit.status === "BOOKED" || visit.status === "COMPLETED") && (
        <div className="card mb-6 bg-green-50 border-green-200">
          <p className="text-sm text-green-800">
            {visit.status === "BOOKED"
              ? "This visit is booked and confirmed."
              : "This visit has been completed."}
          </p>
        </div>
      )}

      {/* Cancel (either party) */}
      {canCancel && (
        <div className="flex justify-end">
          <button
            onClick={() => runAction("/cancel")}
            disabled={working}
            className="btn-danger text-sm"
          >
            Cancel visit
          </button>
        </div>
      )}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4">
      <span className="text-sm font-medium text-gray-500 sm:w-32 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm text-gray-900 whitespace-pre-wrap">{children}</span>
    </div>
  );
}

/* ------------------------------- Accept form ------------------------------ */

function AcceptForm({
  visit,
  working,
  runAction,
}: {
  visit: VisitDetail;
  working: boolean;
  runAction: (path: string, body?: unknown) => Promise<boolean>;
}) {
  const [cost, setCost] = useState("0");
  const [currency, setCurrency] = useState(visit.currency || "USD");
  const [modality, setModality] = useState<"IN_PERSON" | "VIDEO">(
    visit.modality === "VIDEO" ? "VIDEO" : "IN_PERSON"
  );
  const [meetingLink, setMeetingLink] = useState("");
  const [location, setLocation] = useState("");
  const [terms, setTerms] = useState("");
  const [slotSource, setSlotSource] = useState<"CUSTOM" | "EXISTING">("CUSTOM");
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([
    { start: "", end: "" },
  ]);
  const [formError, setFormError] = useState("");

  function updateSlot(i: number, field: "start" | "end", value: string) {
    setSlots((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s))
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const costNum = Number(cost);
    if (!Number.isFinite(costNum) || costNum < 0) {
      setFormError("Enter a valid cost (0 or more).");
      return;
    }
    const costCents = Math.round(costNum * 100);

    if (!terms.trim()) {
      setFormError("Terms are required.");
      return;
    }
    if (modality === "VIDEO" && !/^https?:\/\/\S+$/i.test(meetingLink.trim())) {
      setFormError("A video visit needs a valid http(s) meeting link.");
      return;
    }

    let customSlots: { start: string; end: string }[] | undefined;
    if (slotSource === "CUSTOM") {
      const filled = slots.filter((s) => s.start && s.end);
      if (filled.length === 0) {
        setFormError("Add at least one slot, or use your standing availability.");
        return;
      }
      for (const s of filled) {
        if (new Date(s.end) <= new Date(s.start)) {
          setFormError("Each slot's end must be after its start.");
          return;
        }
        if (new Date(s.start) <= new Date()) {
          setFormError("Slots must be in the future.");
          return;
        }
      }
      customSlots = filled.map((s) => ({
        start: toIso(s.start),
        end: toIso(s.end),
      }));
    }

    await runAction("/accept", {
      costCents,
      currency: currency.trim().toUpperCase(),
      modality,
      meetingLink: modality === "VIDEO" ? meetingLink.trim() : undefined,
      location: modality === "IN_PERSON" ? location.trim() : undefined,
      terms: terms.trim(),
      slotSource,
      customSlots,
    });
  }

  return (
    <form onSubmit={submit} className="card space-y-5 mb-6">
      <h2 className="text-lg font-semibold">Accept request</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Cost</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="input-field"
          />
          <p className="text-xs text-gray-400 mt-1">Enter 0 for a free visit.</p>
        </div>
        <div>
          <label className="label">Currency</label>
          <input
            type="text"
            value={currency}
            maxLength={3}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            className="input-field uppercase"
          />
        </div>
      </div>

      <div>
        <label className="label">Modality</label>
        <select
          value={modality}
          onChange={(e) => setModality(e.target.value as "IN_PERSON" | "VIDEO")}
          className="input-field"
        >
          <option value="IN_PERSON">In-person</option>
          <option value="VIDEO">Video</option>
        </select>
      </div>

      {modality === "VIDEO" ? (
        <div>
          <label className="label">Meeting link</label>
          <input
            type="url"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder="https://..."
            className="input-field"
          />
        </div>
      ) : (
        <div>
          <label className="label">Location (optional)</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Clinic address or room"
            className="input-field"
          />
        </div>
      )}

      <div>
        <label className="label">Terms</label>
        <textarea
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          rows={3}
          className="textarea-field"
          placeholder="Cancellation policy, what's included, etc. The patient must accept these to book."
        />
      </div>

      {/* Slot source */}
      <div>
        <label className="label">Availability</label>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={slotSource === "CUSTOM"}
              onChange={() => setSlotSource("CUSTOM")}
            />
            Offer specific slots for this visit
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={slotSource === "EXISTING"}
              onChange={() => setSlotSource("EXISTING")}
            />
            Let the patient pick from my standing availability
          </label>
        </div>
      </div>

      {slotSource === "CUSTOM" ? (
        <div className="space-y-3">
          {slots.map((s, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div>
                <label className="label">Start</label>
                <input
                  type="datetime-local"
                  value={s.start}
                  onChange={(e) => updateSlot(i, "start", e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">End</label>
                <input
                  type="datetime-local"
                  value={s.end}
                  onChange={(e) => updateSlot(i, "end", e.target.value)}
                  className="input-field"
                />
              </div>
              {slots.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSlots((prev) => prev.filter((_, idx) => idx !== i))}
                  className="btn-secondary text-sm"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSlots((prev) => [...prev, { start: "", end: "" }])}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            + Add another slot
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Make sure you have open slots in the{" "}
          <Link href="/visits/availability" className="text-primary-600 hover:text-primary-700">
            doctor area
          </Link>
          . The patient will choose from your open future slots.
        </p>
      )}

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => runAction("/decline")}
          disabled={working}
          className="btn-secondary text-sm"
        >
          Decline
        </button>
        <button type="submit" disabled={working} className="btn-primary text-sm">
          {working ? "Saving..." : "Accept & set terms"}
        </button>
      </div>
    </form>
  );
}

/* -------------------------------- Book form ------------------------------- */

function BookForm({
  visit,
  working,
  runAction,
}: {
  visit: VisitDetail;
  working: boolean;
  runAction: (path: string, body?: unknown) => Promise<boolean>;
}) {
  const [slotId, setSlotId] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [formError, setFormError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!slotId) {
      setFormError("Choose a slot.");
      return;
    }
    if (!accepted) {
      setFormError("You must accept the cost and terms.");
      return;
    }
    await runAction("/book", { slotId, acceptTerms: true });
  }

  return (
    <form onSubmit={submit} className="card space-y-5 mb-6">
      <h2 className="text-lg font-semibold">Choose a slot</h2>

      {visit.availableSlots.length === 0 ? (
        <p className="text-sm text-gray-500">
          No open slots are available yet. Please check back later.
        </p>
      ) : (
        <div className="space-y-2">
          {visit.availableSlots.map((s) => (
            <label
              key={s.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                slotId === s.id
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="slot"
                checked={slotId === s.id}
                onChange={() => setSlotId(s.id)}
              />
              <span className="text-sm text-gray-900">
                {fmtRange(s.start, s.end)}
              </span>
            </label>
          ))}
        </div>
      )}

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I accept the cost
          {visit.costCents != null
            ? ` (${formatCost(visit.costCents, visit.currency)})`
            : ""}{" "}
          and the terms of this visit.
        </span>
      </label>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={working || visit.availableSlots.length === 0}
          className="btn-primary text-sm"
        >
          {working ? "Booking..." : "Book slot"}
        </button>
      </div>
    </form>
  );
}
