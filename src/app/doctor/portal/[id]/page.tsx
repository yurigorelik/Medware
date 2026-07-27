"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/ui/States";

export default function EditPortalPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    medicalField: "",
    instructions: "",
    guidelines: "",
    literature: "",
    sources: "",
    additionalDefinitions: "",
    welcomeMessage: "",
    isActive: true,
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/portal/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setFormData({
            name: data.name || "",
            medicalField: data.medicalField || "",
            instructions: data.instructions || "",
            guidelines: data.guidelines || "",
            literature: data.literature || "",
            sources: data.sources || "",
            additionalDefinitions: data.additionalDefinitions || "",
            welcomeMessage: data.welcomeMessage || "",
            isActive: data.isActive,
          });
        }
      } catch (error) {
        console.error("Failed to load portal:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [params.id]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const value =
      e.target.type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await fetch(`/api/portal/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update portal");
        return;
      }

      setSuccess("Portal updated successfully");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <LoadingScreen label="Loading portal" />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Portal</h1>
          <p className="text-gray-600">Update your portal configuration</p>
        </div>
        <button
          className="btn-secondary text-sm"
          onClick={() => router.push("/doctor/dashboard")}
        >
          &larr; Dashboard
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg mb-6 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">
            Basic Information
          </h2>
          <div>
            <label htmlFor="name" className="label">
              Portal Name *
            </label>
            <input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>
          <div>
            <label htmlFor="medicalField" className="label">
              Medical Field / Specialty *
            </label>
            <input
              id="medicalField"
              name="medicalField"
              value={formData.medicalField}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-primary-600 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Portal is active (visible to patients)
            </label>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">
            AI Configuration
          </h2>
          <div>
            <label htmlFor="instructions" className="label">
              General Instructions *
            </label>
            <textarea
              id="instructions"
              name="instructions"
              value={formData.instructions}
              onChange={handleChange}
              className="textarea-field"
              rows={6}
              required
            />
          </div>
          <div>
            <label htmlFor="guidelines" className="label">
              Clinical Guidelines
            </label>
            <textarea
              id="guidelines"
              name="guidelines"
              value={formData.guidelines}
              onChange={handleChange}
              className="textarea-field"
              rows={4}
            />
          </div>
          <div>
            <label htmlFor="literature" className="label">
              Literature & References
            </label>
            <textarea
              id="literature"
              name="literature"
              value={formData.literature}
              onChange={handleChange}
              className="textarea-field"
              rows={4}
            />
          </div>
          <div>
            <label htmlFor="sources" className="label">
              Sources
            </label>
            <textarea
              id="sources"
              name="sources"
              value={formData.sources}
              onChange={handleChange}
              className="textarea-field"
              rows={3}
            />
          </div>
          <div>
            <label htmlFor="additionalDefinitions" className="label">
              Additional Definitions & Context
            </label>
            <textarea
              id="additionalDefinitions"
              name="additionalDefinitions"
              value={formData.additionalDefinitions}
              onChange={handleChange}
              className="textarea-field"
              rows={3}
            />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">
            Patient Experience
          </h2>
          <div>
            <label htmlFor="welcomeMessage" className="label">
              Custom Welcome Message
            </label>
            <textarea
              id="welcomeMessage"
              name="welcomeMessage"
              value={formData.welcomeMessage}
              onChange={handleChange}
              className="textarea-field"
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push("/doctor/dashboard")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
