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

interface PatientProfile {
  id: string;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  emergencyContact: string | null;
  medicalHistory: string | null;
  currentMedications: string | null;
  allergies: string | null;
  pastProcedures: string | null;
  familyHistory: string | null;
  socialHistory: string | null;
  insuranceInfo: string | null;
}

export default function PatientDashboard() {
  const { data: session } = useSession();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [profileForm, setProfileForm] = useState({
    dateOfBirth: "",
    gender: "",
    phone: "",
    address: "",
    emergencyContact: "",
    medicalHistory: "",
    currentMedications: "",
    allergies: "",
    pastProcedures: "",
    familyHistory: "",
    socialHistory: "",
    insuranceInfo: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const [consRes, profileRes] = await Promise.all([
          fetch("/api/consultation"),
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
            setProfileForm({
              dateOfBirth: profileData.dateOfBirth || "",
              gender: profileData.gender || "",
              phone: profileData.phone || "",
              address: profileData.address || "",
              emergencyContact: profileData.emergencyContact || "",
              medicalHistory: profileData.medicalHistory || "",
              currentMedications: profileData.currentMedications || "",
              allergies: profileData.allergies || "",
              pastProcedures: profileData.pastProcedures || "",
              familyHistory: profileData.familyHistory || "",
              socialHistory: profileData.socialHistory || "",
              insuranceInfo: profileData.insuranceInfo || "",
            });
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
        body: JSON.stringify(profileForm),
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

  function handleProfileChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  }

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

  const profileComplete = profile && (
    profile.dateOfBirth || profile.medicalHistory || profile.currentMedications
  );

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
                    name="dateOfBirth"
                    value={profileForm.dateOfBirth}
                    onChange={handleProfileChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select
                    name="gender"
                    value={profileForm.gender}
                    onChange={handleProfileChange}
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
                  <label className="label">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={profileForm.phone}
                    onChange={handleProfileChange}
                    className="input-field"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="label">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={profileForm.address}
                    onChange={handleProfileChange}
                    className="input-field"
                    placeholder="City, State"
                  />
                </div>
                <div>
                  <label className="label">Emergency Contact</label>
                  <input
                    type="text"
                    name="emergencyContact"
                    value={profileForm.emergencyContact}
                    onChange={handleProfileChange}
                    className="input-field"
                    placeholder="Name - Phone"
                  />
                </div>
                <div>
                  <label className="label">Insurance Info</label>
                  <input
                    type="text"
                    name="insuranceInfo"
                    value={profileForm.insuranceInfo}
                    onChange={handleProfileChange}
                    className="input-field"
                    placeholder="Provider - Plan"
                  />
                </div>
              </div>
            </div>

            {/* Medical History */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3 border-b pb-2">Medical History</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Medical History</label>
                  <textarea
                    name="medicalHistory"
                    value={profileForm.medicalHistory}
                    onChange={handleProfileChange}
                    className="textarea-field"
                    rows={3}
                    placeholder="List any past or current medical conditions (e.g., diabetes, hypertension, asthma...)"
                  />
                </div>
                <div>
                  <label className="label">Current Medications</label>
                  <textarea
                    name="currentMedications"
                    value={profileForm.currentMedications}
                    onChange={handleProfileChange}
                    className="textarea-field"
                    rows={3}
                    placeholder="List medications and dosages (e.g., Metformin 500mg twice daily...)"
                  />
                </div>
                <div>
                  <label className="label">Allergies</label>
                  <textarea
                    name="allergies"
                    value={profileForm.allergies}
                    onChange={handleProfileChange}
                    className="textarea-field"
                    rows={2}
                    placeholder="List any allergies (medications, food, environmental...)"
                  />
                </div>
                <div>
                  <label className="label">Past Procedures / Surgeries</label>
                  <textarea
                    name="pastProcedures"
                    value={profileForm.pastProcedures}
                    onChange={handleProfileChange}
                    className="textarea-field"
                    rows={2}
                    placeholder="List any past surgeries or procedures with dates..."
                  />
                </div>
                <div>
                  <label className="label">Family History</label>
                  <textarea
                    name="familyHistory"
                    value={profileForm.familyHistory}
                    onChange={handleProfileChange}
                    className="textarea-field"
                    rows={2}
                    placeholder="Relevant family medical history (e.g., Father - heart disease, Mother - diabetes...)"
                  />
                </div>
                <div>
                  <label className="label">Social History</label>
                  <textarea
                    name="socialHistory"
                    value={profileForm.socialHistory}
                    onChange={handleProfileChange}
                    className="textarea-field"
                    rows={2}
                    placeholder="Smoking, alcohol use, exercise, occupation, etc."
                  />
                </div>
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
