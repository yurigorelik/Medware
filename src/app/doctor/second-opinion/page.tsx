"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoadingScreen } from "@/components/ui/States";

interface SecondOpinion {
  id: string;
  patientName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

export default function SecondOpinionListPage() {
  const router = useRouter();
  const [opinions, setOpinions] = useState<SecondOpinion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/second-opinion");
        if (res.ok) {
          const data = await res.json();
          setOpinions(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load second opinions:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!patientName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/second-opinion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientName: patientName.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/doctor/second-opinion/${data.id}`);
      }
    } catch (error) {
      console.error("Failed to create second opinion:", error);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <LoadingScreen label="Loading" />
    );
  }

  const active = opinions.filter((o) => o.status === "ACTIVE");
  const completed = opinions.filter((o) => o.status === "COMPLETED");

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            AI Second Opinion
          </h1>
          <p className="text-gray-600 mt-1">
            Get an AI-powered second opinion on your patients
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/doctor/dashboard" className="btn-secondary text-sm">
            &larr; Dashboard
          </Link>
          <button
            onClick={() => setShowNewModal(true)}
            className="btn-primary text-sm"
          >
            New Second Opinion
          </button>
        </div>
      </div>

      {/* New Second Opinion Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="font-semibold text-lg mb-4">
              Start AI Second Opinion
            </h3>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="label">Patient Name / Identifier</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="input-field"
                  placeholder="Enter patient name or case identifier..."
                  autoFocus
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is for your reference only. The AI will not have access to patient records.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowNewModal(false); setPatientName(""); }}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-sm"
                  disabled={creating || !patientName.trim()}
                >
                  {creating ? "Creating..." : "Start Consultation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Consultations */}
      {active.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Active</h2>
          <div className="space-y-3">
            {active.map((o) => (
              <Link
                key={o.id}
                href={`/doctor/second-opinion/${o.id}`}
                className="card flex items-center justify-between hover:border-primary-300 transition-colors block"
              >
                <div>
                  <div className="font-medium">Patient: {o.patientName}</div>
                  <div className="text-sm text-gray-500">
                    Started {new Date(o.createdAt).toLocaleDateString()} &middot;{" "}
                    {o._count.messages} messages
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-active">Active</span>
                  <span className="btn-primary text-sm">Continue</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Completed</h2>
          <div className="space-y-3">
            {completed.map((o) => (
              <Link
                key={o.id}
                href={`/doctor/second-opinion/${o.id}`}
                className="card flex items-center justify-between hover:border-gray-300 transition-colors block"
              >
                <div>
                  <div className="font-medium">Patient: {o.patientName}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(o.createdAt).toLocaleDateString()} &middot;{" "}
                    {o._count.messages} messages
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-completed">Completed</span>
                  <span className="btn-secondary text-sm">View</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {opinions.length === 0 && (
        <div className="card text-center text-gray-500 py-12">
          No second opinion consultations yet.
          <br />
          <button
            onClick={() => setShowNewModal(true)}
            className="text-primary-600 hover:text-primary-700 mt-2 text-sm"
          >
            Start your first AI second opinion &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
