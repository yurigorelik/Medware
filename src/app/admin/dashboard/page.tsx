"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/ui/States";

interface Stats {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  blockedUsers: number;
  totalConsultations: number;
  activeConsultations: number;
  completedConsultations: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  recentUsers: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
  recentConsultations: {
    id: string;
    status: string;
    createdAt: string;
    patient: { name: string };
    portal: {
      medicalField: string;
      doctorProfile: { user: { name: string } };
    };
  }[];
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <LoadingScreen label="Loading dashboard" />
    );
  }

  if (!stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-red-500">Failed to load dashboard data</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Platform overview and management</p>
        </div>
        <Link href="/admin/users" className="btn-primary text-sm">
          Manage Users
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
          <div className="mt-2 flex space-x-3 text-xs text-gray-500">
            <span>{stats.totalDoctors} doctors</span>
            <span>{stats.totalPatients} patients</span>
          </div>
        </div>

        <div className="card">
          <p className="text-sm text-gray-500">Consultations</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalConsultations}</p>
          <div className="mt-2 flex space-x-3 text-xs text-gray-500">
            <span className="text-green-600">{stats.activeConsultations} active</span>
            <span className="text-blue-600">{stats.completedConsultations} completed</span>
          </div>
        </div>

        <div className="card">
          <p className="text-sm text-gray-500">AI Token Usage</p>
          <p className="text-3xl font-bold text-gray-900">{formatTokens(stats.totalTokens)}</p>
          <div className="mt-2 flex space-x-3 text-xs text-gray-500">
            <span>In: {formatTokens(stats.totalInputTokens)}</span>
            <span>Out: {formatTokens(stats.totalOutputTokens)}</span>
          </div>
        </div>

        <div className="card">
          <p className="text-sm text-gray-500">Blocked Users</p>
          <p className="text-3xl font-bold text-red-600">{stats.blockedUsers}</p>
          <div className="mt-2 text-xs text-gray-500">
            {stats.blockedUsers === 0 ? "No blocked users" : "Users blocked from access"}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Users</h2>
            <Link href="/admin/users" className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
          {stats.recentUsers.length === 0 ? (
            <p className="text-sm text-gray-500">No users yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={`badge text-xs ${user.role === "DOCTOR" ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"}`}>
                      {user.role}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Consultations */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Consultations</h2>
          {stats.recentConsultations.length === 0 ? (
            <p className="text-sm text-gray-500">No consultations yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentConsultations.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {c.patient.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Dr. {c.portal.doctorProfile.user.name} - {c.portal.medicalField}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`badge text-xs ${
                      c.status === "ACTIVE" ? "bg-green-100 text-green-800" :
                      c.status === "COMPLETED" ? "bg-blue-100 text-blue-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {c.status.replace("_", " ")}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
