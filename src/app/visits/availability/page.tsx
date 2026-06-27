"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SlotRangePicker from "@/components/SlotRangePicker";

interface AvailabilitySlot {
  id: string;
  start: string;
  end: string;
  booked: boolean;
  bookedByVisit: { id: string; status: string } | null;
}

export default function AvailabilityPage() {
  const [loading, setLoading] = useState(true);

  // Doctor mode
  const [isDoctor, setIsDoctor] = useState(false);
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [savingMode, setSavingMode] = useState(false);
  const [modeMessage, setModeMessage] = useState("");

  // Availability
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [addingSlot, setAddingSlot] = useState(false);
  const [slotError, setSlotError] = useState("");

  async function loadAvailability() {
    const res = await fetch("/api/visits/availability");
    if (res.ok) {
      const data = await res.json();
      setSlots(Array.isArray(data) ? data : []);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const modeRes = await fetch("/api/visits/doctor-mode");
        if (modeRes.ok) {
          const m = await modeRes.json();
          setIsDoctor(!!m?.isDoctor);
          setSpecialty(m?.specialty || "");
          setBio(m?.bio || "");
        }
        await loadAvailability();
      } catch (err) {
        console.error("Failed to load availability:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function saveMode(e: React.FormEvent) {
    e.preventDefault();
    setSavingMode(true);
    setModeMessage("");
    try {
      const res = await fetch("/api/visits/doctor-mode", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDoctor, specialty, bio }),
      });
      if (res.ok) {
        const m = await res.json();
        setIsDoctor(!!m?.isDoctor);
        setModeMessage("Saved.");
        setTimeout(() => setModeMessage(""), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setModeMessage(data.error || "Failed to save.");
      }
    } catch {
      setModeMessage("Failed to save.");
    } finally {
      setSavingMode(false);
    }
  }

  async function addSlot(slot: { startIso: string; endIso: string }) {
    setSlotError("");
    setAddingSlot(true);
    try {
      const res = await fetch("/api/visits/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: slot.startIso, end: slot.endIso }),
      });
      if (res.ok) {
        await loadAvailability();
      } else {
        const data = await res.json().catch(() => ({}));
        setSlotError(data.error || "Failed to add slot.");
      }
    } catch {
      setSlotError("Failed to add slot.");
    } finally {
      setAddingSlot(false);
    }
  }

  async function deleteSlot(id: string) {
    setSlotError("");
    try {
      const res = await fetch(`/api/visits/availability/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSlots((prev) => prev.filter((s) => s.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        setSlotError(data.error || "Failed to delete slot.");
      }
    } catch {
      setSlotError("Failed to delete slot.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/visits" className="text-sm text-primary-600 hover:text-primary-700">
        &larr; Back to visits
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-6">Doctor area</h1>

      {/* Doctor mode */}
      <form onSubmit={saveMode} className="card space-y-5 mb-8">
        <h2 className="text-lg font-semibold">Doctor mode</h2>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={isDoctor}
            onChange={(e) => setIsDoctor(e.target.checked)}
          />
          <span>
            Enable doctor mode — let patients request visits with me and manage
            my availability.
          </span>
        </label>

        <div>
          <label className="label">Specialty</label>
          <input
            type="text"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="e.g. Cardiology"
            className="input-field"
          />
        </div>

        <div>
          <label className="label">Bio (optional)</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="textarea-field"
            placeholder="A short description patients will see."
          />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={savingMode} className="btn-primary text-sm">
            {savingMode ? "Saving..." : "Save"}
          </button>
          {modeMessage && (
            <span
              className={`text-sm ${
                modeMessage === "Saved." ? "text-green-600" : "text-red-600"
              }`}
            >
              {modeMessage}
            </span>
          )}
        </div>
      </form>

      {/* Standing availability */}
      <div className="card space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Standing availability</h2>
          <p className="text-sm text-gray-500 mt-1">
            Open slots patients can book when you accept a visit using your
            standing availability.
          </p>
        </div>

        {!isDoctor && (
          <p className="text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg">
            Enable doctor mode above to add availability.
          </p>
        )}

        <SlotRangePicker
          onAdd={addSlot}
          disabled={!isDoctor}
          busy={addingSlot}
          addLabel="Add slot"
        />

        {slotError && <p className="text-sm text-red-600">{slotError}</p>}

        {slots.length === 0 ? (
          <p className="text-sm text-gray-500">No availability yet.</p>
        ) : (
          <div className="space-y-2">
            {slots.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
              >
                <div className="text-sm text-gray-900">
                  {new Date(s.start).toLocaleString()} &ndash;{" "}
                  {new Date(s.end).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {s.bookedByVisit && (
                    <span className="badge bg-green-100 text-green-800 ml-2">
                      Booked
                    </span>
                  )}
                </div>
                {s.bookedByVisit ? (
                  <Link
                    href={`/visits/${s.bookedByVisit.id}`}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    View visit
                  </Link>
                ) : (
                  <button
                    onClick={() => deleteSlot(s.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
