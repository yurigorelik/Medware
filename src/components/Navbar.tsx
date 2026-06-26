"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [addingRole, setAddingRole] = useState(false);
  const [specialty, setSpecialty] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [addRoleError, setAddRoleError] = useState("");

  const activeRole = session?.user?.activeRole || session?.user?.role;
  const isBothRole = session?.user?.role === "BOTH";
  const isSingleRole =
    session?.user?.role === "DOCTOR" || session?.user?.role === "PATIENT";

  const dashboardLink =
    activeRole === "ADMIN"
      ? "/admin/dashboard"
      : activeRole === "DOCTOR"
        ? "/doctor/dashboard"
        : "/patient/dashboard";

  async function handleSwitchRole() {
    if (!isBothRole || switching) return;
    setSwitching(true);
    const newRole = activeRole === "DOCTOR" ? "PATIENT" : "DOCTOR";
    await update({ activeRole: newRole });
    setMenuOpen(false);
    setSwitching(false);
    const newDashboard =
      newRole === "DOCTOR" ? "/doctor/dashboard" : "/patient/dashboard";
    router.push(newDashboard);
  }

  function handleAddRoleClick() {
    setMenuOpen(false);
    setAddRoleError("");
    setSpecialty("");
    setLicenseNumber("");
    setShowAddRoleModal(true);
  }

  async function handleAddRole() {
    if (addingRole) return;
    setAddingRole(true);
    setAddRoleError("");

    const targetRole = session?.user?.role === "PATIENT" ? "DOCTOR" : "PATIENT";

    try {
      const res = await fetch("/api/add-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          ...(targetRole === "DOCTOR" && {
            specialty: specialty || "General Medicine",
            licenseNumber: licenseNumber || undefined,
          }),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddRoleError(data.error || "Failed to add role");
        setAddingRole(false);
        return;
      }

      // Update session with new role
      await update({ role: "BOTH", activeRole: targetRole });
      setShowAddRoleModal(false);
      setAddingRole(false);

      const newDashboard =
        targetRole === "DOCTOR" ? "/doctor/dashboard" : "/patient/dashboard";
      router.push(newDashboard);
    } catch {
      setAddRoleError("Something went wrong. Please try again.");
      setAddingRole(false);
    }
  }

  const targetRoleLabel =
    session?.user?.role === "PATIENT" ? "Doctor" : "Patient";

  return (
    <>
      <nav className="bg-white border-b border-gray-200 h-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between items-center h-full">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="font-bold text-xl text-gray-900">MedWare</span>
            </Link>

            {session ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center space-x-2 text-sm"
                >
                  <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 font-medium">
                      {session.user.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:block text-gray-700">
                    {session.user.name}
                  </span>
                  <span
                    className={`hidden sm:block badge text-xs ${
                      activeRole === "ADMIN"
                        ? "bg-red-100 text-red-700"
                        : "bg-primary-100 text-primary-700"
                    }`}
                  >
                    {activeRole}
                  </span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <Link
                      href={dashboardLink}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    {activeRole !== "ADMIN" && (
                      <Link
                        href="/visits"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        Visits
                      </Link>
                    )}
                    {activeRole === "DOCTOR" && (
                      <>
                        <Link
                          href="/doctor/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          Profile Settings
                        </Link>
                        <Link
                          href="/doctor/second-opinion"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          AI Second Opinion
                        </Link>
                      </>
                    )}
                    {activeRole === "ADMIN" && (
                      <Link
                        href="/admin/users"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        Manage Users
                      </Link>
                    )}
                    {isBothRole && (
                      <button
                        onClick={handleSwitchRole}
                        disabled={switching}
                        className="block w-full text-left px-4 py-2 text-sm text-primary-700 hover:bg-primary-50 font-medium"
                      >
                        {switching
                          ? "Switching..."
                          : `Switch to ${activeRole === "DOCTOR" ? "Patient" : "Doctor"} View`}
                      </button>
                    )}
                    {isSingleRole && (
                      <button
                        onClick={handleAddRoleClick}
                        className="block w-full text-left px-4 py-2 text-sm text-primary-700 hover:bg-primary-50 font-medium"
                      >
                        Also become a {targetRoleLabel}
                      </button>
                    )}
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/auth/signin"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign In
                </Link>
                <Link href="/auth/signup" className="btn-primary text-sm">
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Add Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Create {targetRoleLabel} Profile
            </h2>

            {session?.user?.role === "PATIENT" ? (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Add a doctor profile to your account. You&apos;ll be able to
                  switch between your patient and doctor views at any time.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Specialty
                    </label>
                    <input
                      type="text"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="e.g. Cardiology, General Medicine"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      License Number{" "}
                      <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="Medical license number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-600 mb-4">
                Add a patient profile to your account. You&apos;ll be able to
                switch between your doctor and patient views at any time.
              </p>
            )}

            {addRoleError && (
              <p className="text-sm text-red-600 mt-3">{addRoleError}</p>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddRoleModal(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                disabled={addingRole}
              >
                Cancel
              </button>
              <button
                onClick={handleAddRole}
                disabled={addingRole}
                className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
              >
                {addingRole ? "Creating..." : `Create ${targetRoleLabel} Profile`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
