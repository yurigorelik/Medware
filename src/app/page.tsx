"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
    _count: { consultations: number };
  } | null;
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  // Redirect signed-in users to their dashboard
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const dashboardPath =
        session.user.role === "ADMIN"
          ? "/admin/dashboard"
          : session.user.role === "DOCTOR"
            ? "/doctor/dashboard"
            : "/patient/dashboard";
      router.replace(dashboardPath);
    }
  }, [status, session, router]);

  // Fetch available doctors for the showcase
  useEffect(() => {
    if (status !== "unauthenticated") return;

    const loadDoctors = async () => {
      try {
        const res = await fetch("/api/doctors");
        if (res.ok) {
          const data = await res.json();
          setDoctors(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load doctors:", error);
      } finally {
        setLoadingDoctors(false);
      }
    };
    loadDoctors();
  }, [status]);

  // Show loading while determining auth state
  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-primary-50 to-white">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              AI-Powered Medical{" "}
              <span className="text-primary-600">Second Opinions</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Connect with qualified physicians through our intelligent
              consultation platform. Get comprehensive case summaries,
              differential diagnoses, and suggested workups — all reviewed and
              approved by your chosen doctor.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/auth/signup" className="btn-primary text-lg px-8 py-3">
                Get Started
              </Link>
              <Link
                href="/auth/signin"
                className="text-sm font-semibold leading-6 text-gray-900 hover:text-primary-600"
              >
                Sign in <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Doctor Showcase */}
      {!loadingDoctors && doctors.length > 0 && (
        <div className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Our Doctors
              </h2>
              <p className="mt-3 text-lg text-gray-600">
                Browse our network of qualified physicians ready to help
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-primary-200 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {doc.photoUrl ? (
                      <img
                        src={doc.photoUrl}
                        alt={`Dr. ${doc.user.name}`}
                        className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 font-bold text-lg">
                          {doc.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        Dr. {doc.user.name}
                      </h3>
                      <p className="text-sm text-primary-600 truncate">
                        {doc.specialty}
                      </p>
                    </div>
                  </div>

                  {doc.portal && (
                    <div className="mb-3">
                      <span className="inline-block text-xs font-medium bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                        {doc.portal.medicalField}
                      </span>
                    </div>
                  )}

                  {doc.bio && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {doc.bio}
                    </p>
                  )}

                  {doc.portal && doc.portal._count.consultations > 0 && (
                    <p className="text-xs text-gray-400">
                      {doc.portal._count.consultations} consultation{doc.portal._count.consultations !== 1 ? "s" : ""} completed
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/auth/signup"
                className="text-primary-600 hover:text-primary-700 font-semibold text-sm"
              >
                Sign up to start a consultation with any doctor <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Loading state for doctors */}
      {loadingDoctors && (
        <div className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Our Doctors
              </h2>
              <p className="mt-3 text-lg text-gray-600">
                Loading available physicians...
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-12 w-12 bg-gray-200 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-1/3 mb-3" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            How It Works
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="card text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
              <span className="text-primary-600 font-bold text-xl">1</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Choose Your Doctor</h3>
            <p className="text-gray-600">
              Browse our network of qualified physicians and select a specialist
              in the relevant medical field.
            </p>
          </div>
          <div className="card text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
              <span className="text-primary-600 font-bold text-xl">2</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">AI Consultation</h3>
            <p className="text-gray-600">
              Our AI takes your medical history, reviews documents and images,
              and generates a comprehensive assessment.
            </p>
          </div>
          <div className="card text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
              <span className="text-primary-600 font-bold text-xl">3</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Doctor Review</h3>
            <p className="text-gray-600">
              Your chosen physician reviews the AI assessment, adds their expert
              opinion, and delivers the final consultation.
            </p>
          </div>
        </div>
      </div>

      {/* For Doctors and Patients */}
      <div className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="card">
              <h3 className="text-xl font-bold text-primary-700 mb-4">
                For Doctors
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">&#10003;</span>
                  Create your personalized medical portal
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">&#10003;</span>
                  Configure AI with your guidelines and protocols
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">&#10003;</span>
                  Review AI-generated summaries and differential diagnoses
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">&#10003;</span>
                  Edit and approve consultations before delivery
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">&#10003;</span>
                  Manage all patient consultations from one dashboard
                </li>
              </ul>
            </div>
            <div className="card">
              <h3 className="text-xl font-bold text-emerald-700 mb-4">
                For Patients
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2 mt-1">&#10003;</span>
                  Browse qualified specialists in various medical fields
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2 mt-1">&#10003;</span>
                  Chat with AI that follows your doctor&apos;s medical protocols
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2 mt-1">&#10003;</span>
                  Upload medical documents, images, and test results
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2 mt-1">&#10003;</span>
                  Receive comprehensive case summaries with differential diagnoses
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2 mt-1">&#10003;</span>
                  Get doctor-reviewed and approved final opinions
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center text-gray-500 text-sm">
          <p>MedWare &mdash; AI Medical Consultation Platform</p>
          <p className="mt-1">
            This platform provides AI-assisted second opinions reviewed by
            qualified physicians. It is not a substitute for emergency medical
            care.
          </p>
        </div>
      </footer>
    </div>
  );
}
