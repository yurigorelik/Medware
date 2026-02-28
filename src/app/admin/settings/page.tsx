"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface SmtpSettings {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SmtpSettings>({
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setSettings({
            smtpHost: data.smtpHost || "smtp.gmail.com",
            smtpPort: data.smtpPort || 587,
            smtpSecure: data.smtpSecure || false,
            smtpUser: data.smtpUser || "",
            smtpPass: data.smtpPass || "",
            smtpFrom: data.smtpFrom || "",
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings({
          smtpHost: data.smtpHost,
          smtpPort: data.smtpPort,
          smtpSecure: data.smtpSecure,
          smtpUser: data.smtpUser,
          smtpPass: data.smtpPass,
          smtpFrom: data.smtpFrom,
        });
        setMessage({ type: "success", text: "Settings saved successfully!" });
      } else {
        setMessage({ type: "error", text: "Failed to save settings." });
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred while saving." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure SMTP to enable password reset and notification emails
          </p>
        </div>
        <Link href="/admin/dashboard" className="btn-secondary text-sm">
          Back to Dashboard
        </Link>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg mb-6 text-sm ${
          message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
        }`}>
          {message.text}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Gmail Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Gmail Setup Guide</h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Go to your Google Account settings</li>
              <li>Navigate to Security &gt; 2-Step Verification (enable it if not already)</li>
              <li>Go to Security &gt; App passwords</li>
              <li>Create a new app password for &quot;Mail&quot;</li>
              <li>Use your Gmail address as SMTP User and the generated app password as SMTP Password</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="smtpHost" className="label">SMTP Host</label>
              <input
                id="smtpHost"
                type="text"
                value={settings.smtpHost}
                onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                className="input-field"
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label htmlFor="smtpPort" className="label">SMTP Port</label>
              <input
                id="smtpPort"
                type="number"
                value={settings.smtpPort}
                onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) || 587 })}
                className="input-field"
                placeholder="587"
              />
            </div>
          </div>

          <div>
            <label htmlFor="smtpUser" className="label">SMTP User (Email Address)</label>
            <input
              id="smtpUser"
              type="email"
              value={settings.smtpUser}
              onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
              className="input-field"
              placeholder="your-email@gmail.com"
            />
          </div>

          <div>
            <label htmlFor="smtpPass" className="label">SMTP Password (App Password)</label>
            <input
              id="smtpPass"
              type="password"
              value={settings.smtpPass}
              onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
              className="input-field"
              placeholder="Your app password"
            />
            <p className="text-xs text-gray-500 mt-1">
              For Gmail, use an App Password (not your regular password)
            </p>
          </div>

          <div>
            <label htmlFor="smtpFrom" className="label">From Address (optional)</label>
            <input
              id="smtpFrom"
              type="text"
              value={settings.smtpFrom}
              onChange={(e) => setSettings({ ...settings, smtpFrom: e.target.value })}
              className="input-field"
              placeholder='"MedWare" <your-email@gmail.com>'
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to use the SMTP user email address
            </p>
          </div>

          <div className="flex items-center">
            <input
              id="smtpSecure"
              type="checkbox"
              checked={settings.smtpSecure}
              onChange={(e) => setSettings({ ...settings, smtpSecure: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="smtpSecure" className="ml-2 text-sm text-gray-700">
              Use SSL/TLS (port 465). Leave unchecked for STARTTLS (port 587).
            </label>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
