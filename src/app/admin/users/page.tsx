"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/ui/States";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isBlocked: boolean;
  emailVerified: boolean;
  lastActiveAt: string | null;
  createdAt: string;
  specialty: string | null;
  portalName: string | null;
  portalActive: boolean | null;
  consultationCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "DOCTOR" | "PATIENT" | "BLOCKED">("ALL");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleBlock(userId: string, isBlocked: boolean) {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: !isBlocked }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isBlocked: !isBlocked } : u))
        );
      }
    } catch (error) {
      console.error("Failed to toggle block:", error);
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteUser(userId: string) {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
    } finally {
      setActionLoading(null);
      setDeleteConfirm(null);
    }
  }

  const filteredUsers = users.filter((user) => {
    if (user.role === "ADMIN") return false;
    if (filter === "BLOCKED" && !user.isBlocked) return false;
    if (filter === "DOCTOR" && user.role !== "DOCTOR") return false;
    if (filter === "PATIENT" && user.role !== "PATIENT") return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <LoadingScreen label="Loading users" />
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Users" },
        ]}
        title="User management"
        meta={
          <span className="badge-neutral">
            {users.filter((u) => u.role !== "ADMIN").length} total users
          </span>
        }
        actions={
          <Link href="/admin/dashboard" className="btn-secondary">
            <Icon name="dashboard" className="h-4 w-4" />
            Back to dashboard
          </Link>
        }
      />

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field flex-1"
          />
          <div className="flex space-x-2">
            {(["ALL", "DOCTOR", "PATIENT", "BLOCKED"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f === "ALL" ? "All" : f === "BLOCKED" ? "Blocked" : f === "DOCTOR" ? "Doctors" : "Patients"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Consultations</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">AI Tokens</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className={`${user.isBlocked ? "bg-red-50" : "hover:bg-gray-50"}`}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        {user.specialty && (
                          <p className="text-xs text-gray-400">{user.specialty}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge text-xs ${
                        user.role === "DOCTOR" ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"
                      }`}>
                        {user.role}
                      </span>
                      {user.portalName && (
                        <p className="text-xs text-gray-400 mt-1">{user.portalName}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {user.isBlocked ? (
                          <span className="badge text-xs bg-red-100 text-red-800">Blocked</span>
                        ) : (
                          <span className="badge text-xs bg-green-100 text-green-800">Active</span>
                        )}
                        {!user.emailVerified && (
                          <span className="badge text-xs bg-yellow-100 text-yellow-800">Unverified</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{user.consultationCount}</p>
                    </td>
                    <td className="px-6 py-4">
                      {user.totalTokens > 0 ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900">{formatTokens(user.totalTokens)}</p>
                          <p className="text-xs text-gray-400">
                            In: {formatTokens(user.totalInputTokens)} / Out: {formatTokens(user.totalOutputTokens)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">-</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-500">
                        {user.lastActiveAt
                          ? new Date(user.lastActiveAt).toLocaleDateString()
                          : "Never"}
                      </p>
                      <p className="text-xs text-gray-400">
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => toggleBlock(user.id, user.isBlocked)}
                          disabled={actionLoading === user.id}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            user.isBlocked
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                          } disabled:opacity-50`}
                        >
                          {actionLoading === user.id ? "..." : user.isBlocked ? "Unblock" : "Block"}
                        </button>

                        {deleteConfirm === user.id ? (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => deleteUser(user.id)}
                              disabled={actionLoading === user.id}
                              className="px-3 py-1.5 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {actionLoading === user.id ? "..." : "Confirm"}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-3 py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(user.id)}
                            className="px-3 py-1.5 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
