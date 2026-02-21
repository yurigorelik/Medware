"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Portal {
  id: string;
  name: string;
  medicalField: string;
  isActive: boolean;
}

interface Consultation {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  patient: { name: string; email: string };
  summary: { id: string; review: { id: string } | null } | null;
  _count: { messages: number; attachments: number };
}

export default function DoctorDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [portal, setPortal] = useState<Portal | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [portalRes, consRes] = await Promise.all([
          fetch("/api/portal"),
          fetch("/api/consultation"),
        ]);

        const portalData = await portalRes.json();
        if (portalData && portalData.id) {
          setPortal(portalData);
        }

        if (consRes.ok) {
          const consData = await consRes.json();
          setConsultations(Array.isArray(consData) ? consData : []);
        }
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  const pendingReview = consultations.filter(
    (c) => c.status === "SUMMARY_GENERATED" && c.summary && !c.summary.review
  );
  const activeConsultations = consultations.filter(
    (c) => c.status === "ACTIVE"
  );
  const completedConsultations = consultations.filter(
    (c) => c.status === "COMPLETED"
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, Dr. {session?.user?.name}
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your portal and review patient consultations
        </p>
      </div>

      {/* Portal Status */}
      {!portal ? (
        <div className="card mb-8 border-dashed border-2 border-primary-300 bg-primary-50">
          <h2 className="text-lg font-semibold text-primary-800 mb-2">
            Set Up Your Portal
          </h2>
          <p className="text-primary-700 mb-4">
            Create your medical consultation portal to start receiving patients.
            Configure the AI with your guidelines, protocols, and medical
            expertise.
          </p>
          <Link href="/doctor/portal/create" className="btn-primary">
            Create Portal
          </Link>
        </div>
      ) : (
        <div className="card mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{portal.name}</h2>
              <p className="text-gray-600">{portal.medicalField}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={
                  portal.isActive ? "badge-active" : "badge bg-gray-100 text-gray-600"
                }
              >
                {portal.isActive ? "Active" : "Inactive"}
              </span>
              <Link
                href={`/doctor/portal/${portal.id}`}
                className="btn-secondary text-sm"
              >
                Edit Portal
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="text-3xl font-bold text-yellow-600">
            {pendingReview.length}
          </div>
          <div className="text-sm text-gray-600">Pending Review</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-blue-600">
            {activeConsultations.length}
          </div>
          <div className="text-sm text-gray-600">Active Consultations</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-green-600">
            {completedConsultations.length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
      </div>

      {/* Pending Reviews */}
      {pendingReview.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-yellow-700">
            Awaiting Your Review
          </h2>
          <div className="space-y-3">
            {pendingReview.map((c) => (
              <div
                key={c.id}
                className="card flex items-center justify-between border-l-4 border-yellow-400"
              >
                <div>
                  <div className="font-medium">{c.patient.name}</div>
                  <div className="text-sm text-gray-500">
                    {c._count.messages} messages &middot;{" "}
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <Link
                  href={`/doctor/consultations/${c.id}`}
                  className="btn-primary text-sm"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Consultations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">All Consultations</h2>
          <Link
            href="/doctor/consultations"
            className="text-primary-600 text-sm hover:text-primary-700"
          >
            View all &rarr;
          </Link>
        </div>
        {consultations.length === 0 ? (
          <div className="card text-center text-gray-500 py-12">
            No consultations yet. Patients will appear here once they start
            consultations through your portal.
          </div>
        ) : (
          <div className="space-y-3">
            {consultations.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="card flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{c.patient.name}</div>
                  <div className="text-sm text-gray-500">
                    {c._count.messages} messages &middot;{" "}
                    {new Date(c.updatedAt).toLocaleDateString()}
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
                    {c.status.replace("_", " ")}
                  </span>
                  <Link
                    href={`/doctor/consultations/${c.id}`}
                    className="btn-secondary text-sm"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
