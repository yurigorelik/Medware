"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Doctor {
  id: string;
  specialty: string;
  bio: string | null;
  photoUrl: string | null;
  user: { name: string; email: string };
  portal: {
    id: string;
    name: string;
    medicalField: string;
    welcomeMessage: string;
  } | null;
}

export default function BrowseDoctorsPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/doctors");
        if (res.ok) {
          const data = await res.json();
          setDoctors(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load doctors:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function startConsultation(portalId: string) {
    setStarting(portalId);
    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalId }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/patient/consultation/${data.id}`);
      }
    } catch (error) {
      console.error("Failed to start consultation:", error);
    } finally {
      setStarting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-gray-500">Loading doctors...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Find a Doctor
        </h1>
        <p className="text-gray-600 mt-1">
          Browse available physicians and start an AI-powered consultation
        </p>
      </div>

      {doctors.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">
          No doctors with active portals are currently available.
          <br />
          Please check back later.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => (
            <div key={doc.id} className="card flex flex-col">
              <div className="flex items-start gap-3 mb-4">
                {doc.photoUrl ? (
                  <img
                    src={doc.photoUrl}
                    alt={`Dr. ${doc.user.name}`}
                    className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-700 font-bold text-lg">
                      {doc.user.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg">
                    Dr. {doc.user.name}
                  </h3>
                  <p className="text-primary-600 text-sm">{doc.specialty}</p>
                </div>
              </div>

              {doc.portal && (
                <>
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-700">
                      {doc.portal.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {doc.portal.medicalField}
                    </div>
                  </div>

                  {doc.bio && (
                    <p className="text-sm text-gray-600 mb-4 flex-grow">
                      {doc.bio}
                    </p>
                  )}

                  <button
                    onClick={() => startConsultation(doc.portal!.id)}
                    className="btn-primary w-full mt-auto"
                    disabled={starting === doc.portal.id}
                  >
                    {starting === doc.portal.id
                      ? "Starting..."
                      : "Start Consultation"}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
