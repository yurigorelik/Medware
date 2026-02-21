"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Consultation {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  portal: {
    name: string;
    medicalField: string;
    doctorProfile: {
      user: { name: string };
    };
  };
  summary: {
    id: string;
    review: { id: string; approved: boolean } | null;
  } | null;
  _count: { messages: number };
}

export default function PatientDashboard() {
  const { data: session } = useSession();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  const active = consultations.filter((c) => c.status === "ACTIVE");
  const awaitingReview = consultations.filter(
    (c) => c.status === "SUMMARY_GENERATED" || c.status === "UNDER_REVIEW"
  );
  const completed = consultations.filter((c) => c.status === "COMPLETED");

  function getStatusLabel(c: Consultation) {
    switch (c.status) {
      case "ACTIVE":
        return { text: "In Progress", className: "badge-active" };
      case "SUMMARY_GENERATED":
        return { text: "Awaiting Doctor Review", className: "badge-pending" };
      case "UNDER_REVIEW":
        return { text: "Under Review", className: "badge-pending" };
      case "COMPLETED":
        return { text: "Completed", className: "badge-completed" };
      default:
        return { text: c.status, className: "badge" };
    }
  }

  function getActionLink(c: Consultation) {
    if (c.status === "ACTIVE") {
      return { href: `/patient/consultation/${c.id}`, text: "Continue" };
    }
    if (c.status === "COMPLETED" || c.status === "SUMMARY_GENERATED") {
      return { href: `/patient/consultation/${c.id}/summary`, text: "View Summary" };
    }
    return { href: `/patient/consultation/${c.id}/summary`, text: "View" };
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {session?.user?.name}
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your medical consultations
        </p>
      </div>

      {/* Quick Actions */}
      <div className="card mb-8 bg-gradient-to-r from-primary-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary-800">
              Start a New Consultation
            </h2>
            <p className="text-primary-600 text-sm mt-1">
              Browse available doctors and begin an AI-powered consultation
            </p>
          </div>
          <Link href="/patient/doctors" className="btn-primary">
            Browse Doctors
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="text-3xl font-bold text-blue-600">
            {active.length}
          </div>
          <div className="text-sm text-gray-600">Active Consultations</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-yellow-600">
            {awaitingReview.length}
          </div>
          <div className="text-sm text-gray-600">Awaiting Doctor Review</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-green-600">
            {completed.length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
      </div>

      {/* Consultations List */}
      <h2 className="text-lg font-semibold mb-4">Your Consultations</h2>
      {consultations.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">
          You haven&apos;t started any consultations yet.
          <br />
          <Link
            href="/patient/doctors"
            className="text-primary-600 hover:text-primary-700 mt-2 inline-block"
          >
            Browse doctors to get started &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {consultations.map((c) => {
            const status = getStatusLabel(c);
            const action = getActionLink(c);
            return (
              <div
                key={c.id}
                className="card flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">
                    Dr. {c.portal.doctorProfile.user.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {c.portal.medicalField} &middot; {c.portal.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Started {new Date(c.createdAt).toLocaleDateString()}{" "}
                    &middot; {c._count.messages} messages
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={status.className}>{status.text}</span>
                  <Link
                    href={action.href}
                    className={
                      c.status === "ACTIVE"
                        ? "btn-primary text-sm"
                        : "btn-secondary text-sm"
                    }
                  >
                    {action.text}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
