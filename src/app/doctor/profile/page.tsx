"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

interface DoctorProfile {
  id: string;
  clinicName: string | null;
  stampUrl: string | null;
  signatureUrl: string | null;
  specialty: string;
  licenseNumber: string | null;
}

export default function DoctorProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [clinicName, setClinicName] = useState("");

  const stampInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const [stampPreview, setStampPreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [stampFile, setStampFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [removeStamp, setRemoveStamp] = useState(false);
  const [removeSignature, setRemoveSignature] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/doctor-profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setClinicName(data.clinicName || "");
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleStampChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setStampFile(file);
      setRemoveStamp(false);
      const reader = new FileReader();
      reader.onload = () => setStampPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  function handleSignatureChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSignatureFile(file);
      setRemoveSignature(false);
      const reader = new FileReader();
      reader.onload = () => setSignaturePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  function handleRemoveStamp() {
    setStampFile(null);
    setStampPreview(null);
    setRemoveStamp(true);
    if (stampInputRef.current) stampInputRef.current.value = "";
  }

  function handleRemoveSignature() {
    setSignatureFile(null);
    setSignaturePreview(null);
    setRemoveSignature(true);
    if (signatureInputRef.current) signatureInputRef.current.value = "";
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("clinicName", clinicName);

      if (stampFile) formData.append("stamp", stampFile);
      if (signatureFile) formData.append("signature", signatureFile);
      if (removeStamp) formData.append("removeStamp", "true");
      if (removeSignature) formData.append("removeSignature", "true");

      const res = await fetch("/api/doctor-profile", {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setStampFile(null);
        setSignatureFile(null);
        setStampPreview(null);
        setSignaturePreview(null);
        setRemoveStamp(false);
        setRemoveSignature(false);
        setMessage("Profile updated successfully.");
        setTimeout(() => setMessage(""), 3000);
      } else {
        const err = await res.json();
        setMessage(err.error || "Failed to update profile.");
      }
    } catch {
      setMessage("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    );
  }

  const currentStampUrl = removeStamp
    ? null
    : stampPreview || (profile?.stampUrl ? `/api${profile.stampUrl}` : null);
  const currentSignatureUrl = removeSignature
    ? null
    : signaturePreview || (profile?.signatureUrl ? `/api${profile.signatureUrl}` : null);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Profile Settings
          </h1>
          <p className="text-gray-600">
            Manage your clinic name, signature, and stamp for summary letters and prescriptions
          </p>
        </div>
        <button
          className="btn-secondary text-sm"
          onClick={() => router.push("/doctor/dashboard")}
        >
          &larr; Dashboard
        </button>
      </div>

      {message && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg text-sm ${
            message.includes("success")
              ? "bg-green-50 text-green-600"
              : "bg-red-50 text-red-600"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Clinic Information</h2>
          <div>
            <label className="label">Clinic / Practice Name</label>
            <input
              type="text"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className="input-field"
              placeholder="e.g. City Medical Center"
            />
            <p className="text-xs text-gray-500 mt-1">
              This will appear in the header of summary letters and prescriptions
            </p>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Personal Stamp</h2>
          <p className="text-sm text-gray-600">
            Upload an image of your personal stamp. This will appear on summary letters and prescriptions.
          </p>

          {currentStampUrl && (
            <div className="relative inline-block">
              <img
                src={currentStampUrl}
                alt="Stamp"
                className="h-32 border border-gray-200 rounded-lg p-2 bg-white"
              />
              <button
                type="button"
                onClick={handleRemoveStamp}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
              >
                &times;
              </button>
            </div>
          )}

          <div>
            <input
              ref={stampInputRef}
              type="file"
              accept="image/*"
              onChange={handleStampChange}
              className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Signature</h2>
          <p className="text-sm text-gray-600">
            Upload an image of your signature. This will appear on summary letters and prescriptions.
          </p>

          {currentSignatureUrl && (
            <div className="relative inline-block">
              <img
                src={currentSignatureUrl}
                alt="Signature"
                className="h-24 border border-gray-200 rounded-lg p-2 bg-white"
              />
              <button
                type="button"
                onClick={handleRemoveSignature}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
              >
                &times;
              </button>
            </div>
          )}

          <div>
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/*"
              onChange={handleSignatureChange}
              className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
