"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Doctor {
  id: string;
  specialty: string;
  bio: string | null;
  description: string | null;
  photoUrl: string | null;
  user: { name: string; email: string };
  portal: {
    id: string;
    name: string;
    medicalField: string;
    welcomeMessage: string;
  } | null;
  averageRating: number;
  ratingCount: number;
}

function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const sizeClass = size === "lg" ? "w-5 h-5" : "w-4 h-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${sizeClass} ${
            star <= Math.round(rating) ? "text-yellow-400" : "text-gray-300"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="focus:outline-none"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
        >
          <svg
            className={`w-8 h-8 transition-colors ${
              star <= (hover || value) ? "text-yellow-400" : "text-gray-300"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function BrowseDoctorsPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  // Rating modal state
  const [ratingModal, setRatingModal] = useState<Doctor | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingMessage, setRatingMessage] = useState("");

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

  async function openRatingModal(doc: Doctor) {
    setRatingModal(doc);
    setRatingValue(0);
    setRatingComment("");
    setRatingMessage("");

    // Load existing rating
    try {
      const res = await fetch(`/api/doctor-rating?doctorProfileId=${doc.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.userRating) {
          setRatingValue(data.userRating.rating);
          setRatingComment(data.userRating.comment || "");
        }
      }
    } catch {
      // ignore
    }
  }

  async function handleSubmitRating(e: React.FormEvent) {
    e.preventDefault();
    if (!ratingModal || ratingValue === 0) return;

    setSubmittingRating(true);
    setRatingMessage("");

    try {
      const res = await fetch("/api/doctor-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorProfileId: ratingModal.id,
          rating: ratingValue,
          comment: ratingComment || null,
        }),
      });

      if (res.ok) {
        setRatingMessage("Rating submitted successfully!");
        // Update the doctor's rating in the list
        setDoctors((prev) =>
          prev.map((d) => {
            if (d.id === ratingModal.id) {
              const newCount = d.ratingCount + (d.ratingCount > 0 ? 0 : 1);
              return { ...d, ratingCount: Math.max(newCount, 1) };
            }
            return d;
          })
        );
        setTimeout(() => {
          setRatingModal(null);
          // Reload doctors to get fresh ratings
          fetch("/api/doctors")
            .then((r) => r.json())
            .then((data) => setDoctors(Array.isArray(data) ? data : []));
        }, 1500);
      } else {
        const data = await res.json();
        setRatingMessage(data.error || "Failed to submit rating.");
      }
    } catch {
      setRatingMessage("Failed to submit rating.");
    } finally {
      setSubmittingRating(false);
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

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="font-semibold text-lg mb-1">
              Rate Dr. {ratingModal.user.name}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {ratingModal.specialty}
            </p>
            <form onSubmit={handleSubmitRating}>
              <div className="mb-4 flex justify-center">
                <StarInput value={ratingValue} onChange={setRatingValue} />
              </div>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                className="textarea-field mb-4"
                rows={3}
                placeholder="Leave a comment (optional)..."
              />
              {ratingMessage && (
                <div className={`mb-3 text-sm ${ratingMessage.includes("success") ? "text-green-600" : "text-red-600"}`}>
                  {ratingMessage}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setRatingModal(null)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-sm"
                  disabled={submittingRating || ratingValue === 0}
                >
                  {submittingRating ? "Submitting..." : "Submit Rating"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  {doc.ratingCount > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <StarDisplay rating={doc.averageRating} />
                      <span className="text-xs text-gray-500">
                        {doc.averageRating.toFixed(1)} ({doc.ratingCount})
                      </span>
                    </div>
                  )}
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

                  {(doc.description || doc.bio) && (
                    <p className="text-sm text-gray-600 mb-4 flex-grow">
                      {doc.description || doc.bio}
                    </p>
                  )}

                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => startConsultation(doc.portal!.id)}
                      className="btn-primary flex-1"
                      disabled={starting === doc.portal.id}
                    >
                      {starting === doc.portal.id
                        ? "Starting..."
                        : "Start Consultation"}
                    </button>
                    <button
                      onClick={() => openRatingModal(doc)}
                      className="btn-secondary text-sm px-3"
                      title="Rate this doctor"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
