"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { statusBadgeClass, statusLabel, formatCost } from "@/lib/visitFormat";
import { EmptyState, LoadingScreen } from "@/components/ui/States";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";

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
      className="card-interactive flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
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
    <div className="page-shell-narrow">
      <PageHeader
        title="Visits"
        description="Schedule in-person or video visits with a doctor."
        actions={
          <>
            <Link href="/visits/availability" className="btn-secondary">
              <Icon name="clock" className="h-4 w-4" />
              Doctor area
            </Link>
            <Link href="/visits/new" className="btn-primary">
              <Icon name="plus" className="h-4 w-4" />
              Request a visit
            </Link>
          </>
        }
      />

      {/* As a patient */}
      <section className="mb-10">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="section-title">As a patient</h2>
          {asPatient.length > 0 && (
            <span className="badge-neutral">{asPatient.length}</span>
          )}
        </div>
        {asPatient.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No visits yet"
            description="Request a video or in-person visit with any doctor on the platform."
            actionLabel="Request a visit"
            actionHref="/visits/new"
          />
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
          <div className="flex items-center gap-2">
            <h2 className="section-title">As a doctor</h2>
            {asDoctor.length > 0 && (
              <span className="badge-neutral">{asDoctor.length}</span>
            )}
          </div>
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
          <EmptyState
            icon="inbox"
            title={isDoctor ? "No requests yet" : "Doctor mode is off"}
            description={
              isDoctor
                ? "No patients have requested a visit with you yet."
                : "Enable doctor mode in the doctor area to start receiving visit requests."
            }
            {...(isDoctor
              ? {}
              : {
                  actionLabel: "Open doctor area",
                  actionHref: "/visits/availability",
                })}
          />
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
