"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Icon, { type IconName } from "@/components/ui/Icon";
import { LoadingScreen } from "@/components/ui/States";

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

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "search",
    title: "Choose your doctor",
    body: "Browse our network of qualified physicians and select a specialist in the relevant medical field.",
  },
  {
    icon: "sparkles",
    title: "AI consultation",
    body: "Our AI takes your medical history, reviews documents and images, and generates a comprehensive assessment.",
  },
  {
    icon: "check",
    title: "Doctor review",
    body: "Your chosen physician reviews the AI assessment, adds their expert opinion, and delivers the final consultation.",
  },
];

const DOCTOR_POINTS = [
  "Create your personalised medical portal",
  "Configure AI with your guidelines and protocols",
  "Review AI-generated summaries and differential diagnoses",
  "Edit and approve consultations before delivery",
  "Manage all patient consultations from one dashboard",
];

const PATIENT_POINTS = [
  "Browse qualified specialists in various medical fields",
  "Chat with AI that follows your doctor's medical protocols",
  "Upload medical documents, images, and test results",
  "Receive comprehensive case summaries with differential diagnoses",
  "Get doctor-reviewed and approved final opinions",
];

function DoctorCard({ doc, index }: { doc: Doctor; index: number }) {
  return (
    <div
      className="card-interactive animate-in-stagger"
      style={{ "--delay": `${index * 60}ms` } as React.CSSProperties}
    >
      <div className="mb-4 flex items-center gap-3">
        {doc.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doc.photoUrl}
            alt={`Dr. ${doc.user.name}`}
            className="h-12 w-12 flex-shrink-0 rounded-full object-cover ring-2 ring-primary-100"
          />
        ) : (
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-lg font-semibold text-white ring-2 ring-primary-100">
            {doc.user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-gray-900">
            Dr. {doc.user.name}
          </h3>
          <p className="truncate text-sm text-primary-600">{doc.specialty}</p>
        </div>
      </div>

      {doc.portal && (
        <span className="badge-info mb-3">{doc.portal.medicalField}</span>
      )}

      {doc.bio && (
        <p className="line-clamp-2 text-sm leading-relaxed text-gray-600">
          {doc.bio}
        </p>
      )}

      {doc.portal && doc.portal._count.consultations > 0 && (
        <p className="mt-4 flex items-center gap-1.5 border-t border-gray-100 pt-3 text-xs text-gray-400">
          <Icon name="check" className="h-3.5 w-3.5 text-emerald-500" />
          {doc.portal._count.consultations} consultation
          {doc.portal._count.consultations !== 1 ? "s" : ""} completed
        </p>
      )}
    </div>
  );
}

function DoctorCardSkeleton() {
  return (
    <div className="card">
      <div className="mb-4 flex items-center gap-3">
        <div className="skeleton h-12 w-12 flex-shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      </div>
      <div className="skeleton mb-3 h-5 w-24 rounded-full" />
      <div className="skeleton h-3 w-full" />
    </div>
  );
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
        session.user.role === "DOCTOR"
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
    return <LoadingScreen />;
  }

  const specialties = new Set(doctors.map((d) => d.specialty).filter(Boolean));
  const completed = doctors.reduce(
    (sum, d) => sum + (d.portal?._count.consultations ?? 0),
    0
  );

  return (
    <div className="bg-white">
      {/* ------------------------------------------------------------ hero */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary-50 via-white to-white" />
        <div className="absolute inset-0 -z-10 bg-grid-fade bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="blob -top-24 left-1/4 -z-10 h-72 w-72 bg-primary-200/40" />
        <div className="blob -top-10 right-1/4 -z-10 h-64 w-64 bg-accent-200/40" />

        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="chip mx-auto animate-fade-in bg-white/80 backdrop-blur">
              <Icon name="shield" className="h-3.5 w-3.5 text-emerald-600" />
              Every case reviewed by a qualified physician
            </span>

            <h1 className="mt-6 animate-fade-in-up text-display-md text-gray-900 sm:text-display-lg">
              AI-powered medical{" "}
              <span className="text-gradient">second opinions</span>
            </h1>

            <p
              className="mt-6 animate-fade-in-up text-lg leading-8 text-gray-600"
              style={{ "--delay": "80ms" } as React.CSSProperties}
            >
              Connect with qualified physicians through our intelligent
              consultation platform. Get comprehensive case summaries,
              differential diagnoses, and suggested workups — all reviewed and
              approved by your chosen doctor.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/auth/signup" className="btn-primary btn-lg w-full sm:w-auto">
                Get started
                <Icon name="arrowRight" className="h-5 w-5" />
              </Link>
              <Link href="/auth/signin" className="btn-secondary btn-lg w-full sm:w-auto">
                Sign in
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-gray-500">
              <span className="flex items-center gap-2">
                <Icon name="lock" className="h-4 w-4 text-primary-500" />
                Private by default
              </span>
              <span className="flex items-center gap-2">
                <Icon name="document" className="h-4 w-4 text-primary-500" />
                Documents &amp; imaging supported
              </span>
              <span className="flex items-center gap-2">
                <Icon name="stethoscope" className="h-4 w-4 text-primary-500" />
                Specialists across fields
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- stats */}
      {!loadingDoctors && doctors.length > 0 && (
        <section className="border-y border-gray-200 bg-gray-50/60">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-px px-6 py-10 sm:grid-cols-3 lg:px-8">
            {[
              { value: doctors.length, label: "Physicians on the platform" },
              { value: specialties.size, label: "Medical specialties covered" },
              { value: completed, label: "Consultations completed" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-semibold tracking-tight tabular-nums text-primary-700">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --------------------------------------------------------- doctors */}
      {/* Skipped entirely once we know there are no doctors to show, rather
          than leaving an empty grid under a heading. */}
      {(loadingDoctors || doctors.length > 0) && (
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-display-sm text-gray-900">Our doctors</h2>
            <p className="mt-3 text-lg text-gray-600">
              {loadingDoctors
                ? "Loading available physicians…"
                : "Browse our network of qualified physicians ready to help"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loadingDoctors
              ? [1, 2, 3, 4].map((i) => <DoctorCardSkeleton key={i} />)
              : doctors.map((doc, i) => (
                  <DoctorCard key={doc.id} doc={doc} index={i} />
                ))}
          </div>

          {!loadingDoctors && doctors.length > 0 && (
            <div className="mt-10 text-center">
              <Link href="/auth/signup" className="link inline-flex items-center gap-1.5">
                Sign up to start a consultation with any doctor
                <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>
      )}

      {/* ---------------------------------------------------- how it works */}
      <section className="border-t border-gray-200 bg-gray-50/60 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-display-sm text-gray-900">How it works</h2>
            <p className="mt-3 text-lg text-gray-600">
              Three steps from question to physician-approved answer.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Connecting line behind the step markers on wide screens */}
            <div
              aria-hidden="true"
              className="absolute left-[16.667%] right-[16.667%] top-12 hidden h-px bg-gradient-to-r from-primary-200 via-primary-300 to-primary-200 md:block"
            />
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="card relative animate-in-stagger text-center"
                style={{ "--delay": `${i * 90}ms` } as React.CSSProperties}
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-glow">
                  <Icon name={step.icon} className="h-6 w-6" />
                </div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-primary-600">
                  Step {i + 1}
                </span>
                <h3 className="text-lg font-semibold text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-2 leading-relaxed text-gray-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------ doctors versus patients */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="card border-primary-100 bg-gradient-to-br from-primary-50/60 to-white">
              <div className="mb-5 flex items-center gap-3">
                <span className="icon-tile bg-primary-100 text-primary-700">
                  <Icon name="stethoscope" className="h-5 w-5" />
                </span>
                <h3 className="text-xl font-bold text-primary-800">
                  For doctors
                </h3>
              </div>
              <ul className="space-y-3">
                {DOCTOR_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-gray-700">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                      <Icon name="check" className="h-3 w-3" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card border-accent-100 bg-gradient-to-br from-accent-50/60 to-white">
              <div className="mb-5 flex items-center gap-3">
                <span className="icon-tile bg-accent-100 text-accent-700">
                  <Icon name="heart" className="h-5 w-5" />
                </span>
                <h3 className="text-xl font-bold text-accent-800">
                  For patients
                </h3>
              </div>
              <ul className="space-y-3">
                {PATIENT_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-gray-700">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
                      <Icon name="check" className="h-3 w-3" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ closing CTA */}
      <section className="px-6 pb-20 lg:px-8">
        <div className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-accent-600 px-6 py-16 text-center shadow-xl">
          <div className="blob -left-10 -top-10 h-56 w-56 bg-white/20" />
          <div className="blob -bottom-16 -right-10 h-64 w-64 bg-accent-300/30" />
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready for a second opinion?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-50">
            Start a consultation today and have your case reviewed by a
            qualified physician.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/signup"
              className="btn btn-lg w-full bg-white text-primary-700 shadow-lg hover:-translate-y-px hover:bg-primary-50 sm:w-auto"
            >
              Create your account
              <Icon name="arrowRight" className="h-5 w-5" />
            </Link>
            <Link
              href="/auth/signin"
              className="btn btn-lg w-full border border-white/40 text-white hover:bg-white/10 sm:w-auto"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
