"use client";

import { useEffect, useState } from "react";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: "DOCTOR" | "PATIENT" | "ADMIN";
  isBlocked: boolean;
  emailVerified: boolean;
  createdAt: string;
  consultationCount: number;
  doctorProfile: {
    specialty: string;
    portal: {
      id: string;
      name: string;
      medicalField: string;
      isActive: boolean;
      _count: { consultations: number };
    } | null;
  } | null;
  tokenUsage: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    callCount: number;
  };
}

type TabType = "all" | "doctors" | "patients" | "admins";

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [confirmAction, setConfirmAction] = useState<{
    type: "block" | "delete" | "admin";
    userId: string;
    userName: string;
  } | null>(null);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleBlock = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/block`, {
        method: "POST",
      });
      if (res.ok) {
        await loadUsers();
      }
    } catch (error) {
      console.error("Failed to block/unblock user:", error);
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const handleDelete = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/delete`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadUsers();
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const handleMakeAdmin = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/make-admin`, {
        method: "POST",
      });
      if (res.ok) {
        await loadUsers();
      }
    } catch (error) {
      console.error("Failed to make admin:", error);
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (activeTab === "doctors") return u.role === "DOCTOR";
    if (activeTab === "patients") return u.role === "PATIENT";
    if (activeTab === "admins") return u.role === "ADMIN";
    return true;
  });

  const doctorCount = users.filter((u) => u.role === "DOCTOR").length;
  const patientCount = users.filter((u) => u.role === "PATIENT").length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const totalTokens = users.reduce(
    (sum, u) => sum + u.tokenUsage.totalTokens,
    0
  );

  const formatNumber = (n: number) => n.toLocaleString();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-gray-500">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Manage users, view statistics, and monitor platform usage
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Doctors</p>
          <p className="text-2xl font-bold text-primary-600">{doctorCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Patients</p>
          <p className="text-2xl font-bold text-emerald-600">{patientCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Tokens Used</p>
          <p className="text-2xl font-bold text-amber-600">
            {formatNumber(totalTokens)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
        {(
          [
            { key: "all", label: `All (${users.length})` },
            { key: "doctors", label: `Doctors (${doctorCount})` },
            { key: "patients", label: `Patients (${patientCount})` },
            { key: "admins", label: `Admins (${adminCount})` },
          ] as { key: TabType; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  User
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Details
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Consultations
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Token Usage
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`${user.isBlocked ? "bg-red-50" : ""} hover:bg-gray-50`}
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      <p className="text-xs text-gray-400">
                        Joined{" "}
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.role === "ADMIN"
                          ? "bg-purple-100 text-purple-700"
                          : user.role === "DOCTOR"
                            ? "bg-primary-100 text-primary-700"
                            : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {user.role === "DOCTOR" && user.doctorProfile ? (
                      <div>
                        <p className="text-xs">{user.doctorProfile.specialty}</p>
                        {user.doctorProfile.portal ? (
                          <p className="text-xs text-gray-400">
                            Portal: {user.doctorProfile.portal.name}
                            {user.doctorProfile.portal.isActive ? (
                              <span className="text-green-500 ml-1">Active</span>
                            ) : (
                              <span className="text-red-500 ml-1">Inactive</span>
                            )}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400">No portal</p>
                        )}
                      </div>
                    ) : user.role === "PATIENT" ? (
                      <p className="text-xs text-gray-400">Patient</p>
                    ) : (
                      <p className="text-xs text-gray-400">Administrator</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.role === "DOCTOR" && user.doctorProfile?.portal ? (
                      <div>
                        <p className="text-sm font-medium">
                          {user.doctorProfile.portal._count.consultations}
                        </p>
                        <p className="text-xs text-gray-400">
                          as doctor
                        </p>
                      </div>
                    ) : user.role === "PATIENT" ? (
                      <div>
                        <p className="text-sm font-medium">
                          {user.consultationCount}
                        </p>
                        <p className="text-xs text-gray-400">
                          as patient
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.tokenUsage.totalTokens > 0 ? (
                      <div>
                        <p className="text-sm font-medium">
                          {formatNumber(user.tokenUsage.totalTokens)}
                        </p>
                        <p className="text-xs text-gray-400">
                          In: {formatNumber(user.tokenUsage.totalInputTokens)} /
                          Out: {formatNumber(user.tokenUsage.totalOutputTokens)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {user.tokenUsage.callCount} API call{user.tokenUsage.callCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No usage</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {user.isBlocked && (
                        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          Blocked
                        </span>
                      )}
                      {!user.emailVerified && (
                        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                          Unverified
                        </span>
                      )}
                      {!user.isBlocked && user.emailVerified && (
                        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          Active
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.role !== "ADMIN" && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            setConfirmAction({
                              type: "block",
                              userId: user.id,
                              userName: user.name,
                            })
                          }
                          disabled={actionLoading === user.id}
                          className={`text-xs px-2 py-1 rounded font-medium ${
                            user.isBlocked
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                          }`}
                        >
                          {user.isBlocked ? "Unblock" : "Block"}
                        </button>
                        <button
                          onClick={() =>
                            setConfirmAction({
                              type: "admin",
                              userId: user.id,
                              userName: user.name,
                            })
                          }
                          disabled={actionLoading === user.id}
                          className="text-xs px-2 py-1 rounded font-medium bg-purple-100 text-purple-700 hover:bg-purple-200"
                        >
                          Make Admin
                        </button>
                        <button
                          onClick={() =>
                            setConfirmAction({
                              type: "delete",
                              userId: user.id,
                              userName: user.name,
                            })
                          }
                          disabled={actionLoading === user.id}
                          className="text-xs px-2 py-1 rounded font-medium bg-red-100 text-red-700 hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {confirmAction.type === "block"
                ? "Block / Unblock User"
                : confirmAction.type === "delete"
                  ? "Delete User"
                  : "Make Administrator"}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {confirmAction.type === "block"
                ? `Are you sure you want to toggle the block status of "${confirmAction.userName}"?`
                : confirmAction.type === "delete"
                  ? `Are you sure you want to permanently delete "${confirmAction.userName}"? This action cannot be undone and will delete all their data.`
                  : `Are you sure you want to make "${confirmAction.userName}" an administrator? They will have full access to this dashboard.`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === "block") {
                    handleBlock(confirmAction.userId);
                  } else if (confirmAction.type === "delete") {
                    handleDelete(confirmAction.userId);
                  } else {
                    handleMakeAdmin(confirmAction.userId);
                  }
                }}
                disabled={actionLoading === confirmAction.userId}
                className={`px-4 py-2 text-sm text-white rounded-lg ${
                  confirmAction.type === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : confirmAction.type === "admin"
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "bg-yellow-600 hover:bg-yellow-700"
                }`}
              >
                {actionLoading === confirmAction.userId
                  ? "Processing..."
                  : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
