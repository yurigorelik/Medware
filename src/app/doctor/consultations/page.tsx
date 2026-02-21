"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Consultation {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  patient: { name: string; email: string };
  summary: { id: string; review: { id: string } | null } | null;
  _count: { messages: number; attachments: number };
}

export default function DoctorConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/consultation");
        if (res.ok) {
          const data = await res.json();
          setConsultations(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load consultations:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filtered =
    filter === "ALL"
      ? consultations
      : consultations.filter((c) => c.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-gray-500">Loading consultations...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Consultations</h1>
        <Link
          href="/doctor/dashboard"
          className="btn-secondary text-sm"
        >
          &larr; Dashboard
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["ALL", "ACTIVE", "SUMMARY_GENERATED", "COMPLETED", "CLOSED"].map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === s
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {s === "ALL" ? "All" : s.replace(/_/g, " ")}
              {s !== "ALL" && (
                <span className="ml-1.5 text-xs">
                  ({consultations.filter((c) => c.status === s).length})
                </span>
              )}
            </button>
          )
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">
          No consultations found
          {filter !== "ALL" && " for this filter"}.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className={`card flex items-center justify-between ${
                c.status === "SUMMARY_GENERATED" && !c.summary?.review
                  ? "border-l-4 border-yellow-400"
                  : ""
              }`}
            >
              <div>
                <div className="font-medium">{c.patient.name}</div>
                <div className="text-sm text-gray-500">
                  {c.patient.email} &middot; {c._count.messages} messages
                  {c._count.attachments > 0 &&
                    ` &middot; ${c._count.attachments} files`}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Started {new Date(c.createdAt).toLocaleDateString()} &middot;
                  Updated {new Date(c.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
