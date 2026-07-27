"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import AutocompleteList, { CodeItem } from "@/components/AutocompleteList";
import SocialHistoryChecklist, {
  SocialHistoryData,
  defaultSocialHistory,
} from "@/components/SocialHistoryChecklist";
import {
  EmptyState,
  LoadingScreen,
  StatCard,
} from "@/components/ui/States";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";

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
    review: { id: string; approved: boolean; followUpRequested: boolean } | null;
  } | null;
  parentConsultationId: string | null;
  _count: { messages: number };
}

interface PatientProfile {
  id: string;
  dateOfBirth: string | null;
  gender: string | null;
  preferredLanguage: string | null;
  medicalHistory: string | null;
  currentMedications: string | null;
  allergies: string | null;
  pastProcedures: string | null;
  familyHistory: string | null;
  socialHistory: string | null;
}

function parseJsonArray(val: string | null): CodeItem[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Not JSON - ignore legacy text data
  }
  return [];
}

function parseSocialHistory(val: string | null): SocialHistoryData {
  if (!val) return { ...defaultSocialHistory };
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === "object" && !Array.isArray(parsed)) {
      return { ...defaultSocialHistory, ...parsed };
    }
  } catch {
    // Not JSON - ignore legacy text data
  }
  return { ...defaultSocialHistory };
}

export default function PatientDashboard() {
  const { data: session } = useSession();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Simple fields
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");

  // Structured fields stored as JSON
  const [medicalHistory, setMedicalHistory] = useState<CodeItem[]>([]);
  const [currentMedications, setCurrentMedications] = useState<CodeItem[]>([]);
  const [allergies, setAllergies] = useState("");
  const [pastProcedures, setPastProcedures] = useState<CodeItem[]>([]);
  const [familyHistory, setFamilyHistory] = useState<CodeItem[]>([]);
  const [socialHistory, setSocialHistory] =
    useState<SocialHistoryData>(defaultSocialHistory);

  useEffect(() => {
    async function load() {
      try {
        const [consRes, profileRes] = await Promise.all([
          fetch("/api/consultation?as=patient"),
          fetch("/api/patient-profile"),
        ]);

        if (consRes.ok) {
          const data = await consRes.json();
          setConsultations(Array.isArray(data) ? data : []);
        }

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData) {
            setProfile(profileData);
            setDateOfBirth(profileData.dateOfBirth || "");
            setGender(profileData.gender || "");
            setPreferredLanguage(profileData.preferredLanguage || "");
            setMedicalHistory(parseJsonArray(profileData.medicalHistory));
            setCurrentMedications(
              parseJsonArray(profileData.currentMedications)
            );
            setAllergies(profileData.allergies || "");
            setPastProcedures(parseJsonArray(profileData.pastProcedures));
            setFamilyHistory(parseJsonArray(profileData.familyHistory));
            setSocialHistory(parseSocialHistory(profileData.socialHistory));
          }
        }
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMessage("");

    try {
      const res = await fetch("/api/patient-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateOfBirth,
          gender,
          preferredLanguage,
          medicalHistory: JSON.stringify(medicalHistory),
          currentMedications: JSON.stringify(currentMedications),
          allergies,
          pastProcedures: JSON.stringify(pastProcedures),
          familyHistory: JSON.stringify(familyHistory),
          socialHistory: JSON.stringify(socialHistory),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setSaveMessage("Profile saved successfully!");
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        setSaveMessage("Failed to save profile.");
      }
    } catch {
      setSaveMessage("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <LoadingScreen label="Loading dashboard" />
    );
  }

  const active = consultations.filter((c) => c.status === "ACTIVE");
  const awaitingReview = consultations.filter(
    (c) => c.status === "SUMMARY_GENERATED" || c.status === "UNDER_REVIEW"
  );
  const completed = consultations.filter((c) => c.status === "COMPLETED");

  function getStatusLabel(c: Consultation) {
    if (c.status === "COMPLETED" && c.summary?.review?.followUpRequested) {
      return { text: "Follow-Up Requested", className: "badge-pending" };
    }
    switch (c.status) {
      case "ACTIVE":
        return {
          text: c.parentConsultationId ? "Follow-Up In Progress" : "In Progress",
          className: "badge-active",
        };
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

  const profileComplete = profile && (
    profile.dateOfBirth || profile.medicalHistory || profile.currentMedications
  );

  return (
    <div className="page-shell">
      <PageHeader
        title={`Welcome, ${session?.user?.name ?? ""}`}
        description="Manage your medical consultations and keep your profile up to date."
        actions={
          <Link href="/patient/doctors" className="btn-primary">
            <Icon name="search" className="h-4 w-4" />
            Browse doctors
          </Link>
        }
      />

      {/* Quick Actions */}
      <div className="card-accent mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="icon-tile bg-primary-100 text-primary-700">
              <Icon name="sparkles" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-primary-900">
                Start a new consultation
              </h2>
              <p className="mt-1 text-sm text-primary-700/80">
                Browse available doctors and begin an AI-powered consultation
              </p>
            </div>
          </div>
          <Link href="/patient/doctors" className="btn-primary flex-shrink-0">
            Browse doctors
            <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Medical Profile Section */}
      <div className="card mb-8">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setProfileOpen(!profileOpen)}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${profileComplete ? "bg-green-100" : "bg-yellow-100"}`}>
              <svg className={`w-5 h-5 ${profileComplete ? "text-green-600" : "text-yellow-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">My Medical Profile</h2>
              <p className="text-sm text-gray-500">
                {profileComplete
                  ? "Your basic information is on file"
                  : "Complete your profile to share with your consultations"}
              </p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transform transition-transform ${profileOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {profileOpen && (
          <form onSubmit={handleProfileSave} className="mt-6 space-y-6">
            {/* Demographics */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3 border-b pb-2">Demographics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Date of Birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="label">Preferred Language</label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select...</option>
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Italian">Italian</option>
                    <option value="Portuguese">Portuguese</option>
                    <option value="Russian">Russian</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Korean">Korean</option>
                    <option value="Arabic">Arabic</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Hebrew">Hebrew</option>
                    <option value="Turkish">Turkish</option>
                    <option value="Dutch">Dutch</option>
                    <option value="Polish">Polish</option>
                    <option value="Swedish">Swedish</option>
                    <option value="Vietnamese">Vietnamese</option>
                    <option value="Thai">Thai</option>
                    <option value="Ukrainian">Ukrainian</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Medical History */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3 border-b pb-2">Medical History</h3>
              <div className="space-y-4">
                <AutocompleteList
                  label="Medical History (Diagnoses)"
                  searchEndpoint="/api/search/icd10-diagnoses"
                  items={medicalHistory}
                  onItemsChange={setMedicalHistory}
                  placeholder="Search ICD-10 diagnoses (e.g., diabetes, hypertension...)"
                  displayField="description"
                />

                <AutocompleteList
                  label="Current Medications"
                  searchEndpoint="/api/search/atc4-medications"
                  items={currentMedications}
                  onItemsChange={setCurrentMedications}
                  placeholder="Search medications by generic name (e.g., metformin, amlodipine...)"
                  helperText="Please use generic medication names when possible"
                  displayField="name"
                />

                <div>
                  <label className="label">Allergies</label>
                  <textarea
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    className="textarea-field"
                    rows={2}
                    placeholder="List any allergies (medications, food, environmental...)"
                  />
                </div>

                <AutocompleteList
                  label="Past Procedures / Surgeries"
                  searchEndpoint="/api/search/icd10-procedures"
                  items={pastProcedures}
                  onItemsChange={setPastProcedures}
                  placeholder="Search procedures (e.g., appendectomy, knee replacement...)"
                  displayField="description"
                />

                <AutocompleteList
                  label="Family History"
                  searchEndpoint="/api/search/icd10-diagnoses"
                  items={familyHistory}
                  onItemsChange={setFamilyHistory}
                  placeholder="Search conditions in family (e.g., heart disease, diabetes...)"
                  helperText="Add medical conditions that run in your family"
                  displayField="description"
                />

                <SocialHistoryChecklist
                  value={socialHistory}
                  onChange={setSocialHistory}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </button>
              {saveMessage && (
                <span className={`text-sm ${saveMessage.includes("success") ? "text-green-600" : "text-red-600"}`}>
                  {saveMessage}
                </span>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Active consultations"
          value={active.length}
          icon="activity"
          tone="primary"
        />
        <StatCard
          label="Awaiting doctor review"
          value={awaitingReview.length}
          icon="clock"
          tone="amber"
        />
        <StatCard
          label="Completed"
          value={completed.length}
          icon="check"
          tone="emerald"
        />
      </div>

      {/* Consultations List */}
      <h2 className="section-title mb-4">Your consultations</h2>
      {consultations.length === 0 ? (
        <EmptyState
          icon="message"
          title="No consultations yet"
          description="Pick a specialist and start an AI-guided consultation — your chosen doctor reviews and approves everything before it reaches you."
          actionLabel="Browse doctors"
          actionHref="/patient/doctors"
        />
      ) : (
        <div className="space-y-3">
          {consultations.map((c) => {
            const status = getStatusLabel(c);
            const action = getActionLink(c);
            return (
              <div
                key={c.id}
                className="card-interactive flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="icon-tile bg-primary-50 text-primary-600">
                    <Icon name="stethoscope" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-gray-900">
                      Dr. {c.portal.doctorProfile.user.name}
                    </div>
                    <div className="truncate text-sm text-gray-500">
                      {c.portal.medicalField} &middot; {c.portal.name}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      Started {new Date(c.createdAt).toLocaleDateString()}{" "}
                      &middot; {c._count.messages} messages
                    </div>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-3">
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
