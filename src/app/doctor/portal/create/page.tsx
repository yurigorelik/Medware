"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreatePortalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    medicalField: "",
    instructions: "",
    guidelines: "",
    literature: "",
    sources: "",
    additionalDefinitions: "",
    welcomeMessage: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create portal");
        return;
      }

      router.push("/doctor/dashboard");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Create Your Portal
      </h1>
      <p className="text-gray-600 mb-8">
        Configure the AI consultation assistant with your medical expertise,
        guidelines, and protocols. The AI will use this information to conduct
        patient consultations on your behalf.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
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
              placeholder="e.g., Dr. Smith's Cardiology Consultation"
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
              placeholder="e.g., Cardiology, Neurology, Orthopedic Surgery"
              required
            />
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
            <p className="text-xs text-gray-500 mb-1">
              Provide instructions for how the AI should conduct consultations.
              Include your preferred approach, focus areas, and any specific
              protocols.
            </p>
            <textarea
              id="instructions"
              name="instructions"
              value={formData.instructions}
              onChange={handleChange}
              className="textarea-field"
              rows={6}
              placeholder="e.g., Focus on cardiovascular risk assessment. Always ask about family history of heart disease. Use ACC/AHA guidelines for risk stratification..."
              required
            />
          </div>

          <div>
            <label htmlFor="guidelines" className="label">
              Clinical Guidelines
            </label>
            <p className="text-xs text-gray-500 mb-1">
              Reference clinical guidelines the AI should follow (e.g., ACC/AHA,
              ESC, NICE).
            </p>
            <textarea
              id="guidelines"
              name="guidelines"
              value={formData.guidelines}
              onChange={handleChange}
              className="textarea-field"
              rows={4}
              placeholder="e.g., Follow 2023 ACC/AHA Guidelines for heart failure management..."
            />
          </div>

          <div>
            <label htmlFor="literature" className="label">
              Literature & References
            </label>
            <p className="text-xs text-gray-500 mb-1">
              Key papers, studies, or textbooks the AI should reference.
            </p>
            <textarea
              id="literature"
              name="literature"
              value={formData.literature}
              onChange={handleChange}
              className="textarea-field"
              rows={4}
              placeholder="e.g., Harrison's Principles of Internal Medicine, Braunwald's Heart Disease..."
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
              placeholder="e.g., UpToDate, PubMed, Cochrane Library..."
            />
          </div>

          <div>
            <label htmlFor="additionalDefinitions" className="label">
              Additional Definitions & Context
            </label>
            <p className="text-xs text-gray-500 mb-1">
              Any additional context, terminology definitions, or special
              instructions for the AI.
            </p>
            <textarea
              id="additionalDefinitions"
              name="additionalDefinitions"
              value={formData.additionalDefinitions}
              onChange={handleChange}
              className="textarea-field"
              rows={3}
              placeholder="e.g., When referring to 'chest pain,' always differentiate between cardiac and non-cardiac causes..."
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
            <p className="text-xs text-gray-500 mb-1">
              Optional. The first message patients see when they start a
              consultation. Leave blank for a default greeting.
            </p>
            <textarea
              id="welcomeMessage"
              name="welcomeMessage"
              value={formData.welcomeMessage}
              onChange={handleChange}
              className="textarea-field"
              rows={3}
              placeholder="e.g., Welcome! I'm the AI assistant for Dr. Smith's cardiology practice. I'll be gathering information about your heart-related concerns..."
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating..." : "Create Portal"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.back()}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
