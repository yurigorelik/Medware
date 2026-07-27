"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { statusBadgeClass, statusLabel, formatCost } from "@/lib/visitFormat";
import { LoadingScreen } from "@/components/ui/States";

interface VisitListItem {
  id: string;
  patientId: string;
  doctorId: string;
  status: string;
  modality: string;
  reason: string | null;
  costCents: number | null;
  currency: string;
  requestedBy: string;
  scheduledStart: string | null;
  patient: { id: string; name: string; email: string };
  doctor: { id: string; name: string; email: string; specialty: string | null };
  updatedAt: string;
}

function VisitRow({
  visit,
  side,
}: {
  visit: VisitListItem;
  side: "patient" | "doctor";
}) {
  const other = side === "patient" ? visit.doctor : visit.patient;
  const otherLabel =
    side === "patient"
      ? `Dr. ${other.name}${visit.doctor.specialty ? ` · ${visit.doctor.specialty}` : ""}`
      : other.name;

  return (
    <Link
      href={`/visits/${visit.id}`}
      className="card flex items-center justify-between hover:border-primary-200 transition-colors"
    >
      <div className="min-w-0">
        <div className="font-medium text-gray-900">{otherLabel}</div>
        <div className="text-sm text-gray-500 truncate">
          {visit.modality === "VIDEO" ? "Video visit" : "In-person visit"}
          {visit.reason ? ` · ${visit.reason}` : ""}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {visit.scheduledStart
            ? `Scheduled ${new Date(visit.scheduledStart).toLocaleString()}`
            : `Updated ${new Date(visit.updatedAt).toLocaleDateString()}`}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {formatCost(visit.costCents, visit.currency) && (
          <span className="text-sm text-gray-600">
            {formatCost(visit.costCents, visit.currency)}
          </span>
        )}
        <span className={statusBadgeClass(visit.status)}>
          {statusLabel(visit.status)}
        </span>
      </div>
    </Link>
  );
}

export default function VisitsHubPage() {
  const { data: session } = useSession();
  const [visits, setVisits] = useState<VisitListItem[]>([]);
  const [isDoctor, setIsDoctor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [visitsRes, modeRes] = await Promise.all([
          fetch("/api/visits"),
          fetch("/api/visits/doctor-mode"),
        ]);
        if (visitsRes.ok) {
          const data = await visitsRes.json();
          setVisits(Array.isArray(data) ? data : []);
        }
        if (modeRes.ok) {
          const mode = await modeRes.json();
          setIsDoctor(!!mode?.isDoctor);
        }
      } catch (error) {
        console.error("Failed to load visits:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <LoadingScreen label="Loading visits" />
    );
  }

  const myId = session?.user?.id;
  const asPatient = visits.filter((v) => v.patientId === myId);
  const asDoctor = visits.filter((v) => v.doctorId === myId);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visits</h1>
          <p className="text-gray-600 mt-1">
            Schedule in-person or video visits with a doctor.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/visits/availability" className="btn-secondary text-sm">
            Doctor area
          </Link>
          <Link href="/visits/new" className="btn-primary text-sm">
            Request a visit
          </Link>
        </div>
      </div>

      {/* As a patient */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">As a patient</h2>
        {asPatient.length === 0 ? (
          <div className="card text-center text-gray-500 py-10">
            You have no visits as a patient yet.{" "}
            <Link href="/visits/new" className="text-primary-600 hover:text-primary-700">
              Request one &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {asPatient.map((v) => (
              <VisitRow key={v.id} visit={v} side="patient" />
            ))}
          </div>
        )}
      </section>

      {/* As a doctor */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">As a doctor</h2>
          {!isDoctor && (
            <Link
              href="/visits/availability"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Enable doctor mode &rarr;
            </Link>
          )}
        </div>
        {asDoctor.length === 0 ? (
          <div className="card text-center text-gray-500 py-10">
            {isDoctor
              ? "No patients have requested a visit with you yet."
              : "Enable doctor mode in the doctor area to receive visit requests."}
          </div>
        ) : (
          <div className="space-y-3">
            {asDoctor.map((v) => (
              <VisitRow key={v.id} visit={v} side="doctor" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
