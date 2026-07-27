"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LoadingScreen, StatCard } from "@/components/ui/States";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";

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
    <div className="page-shell">
      <PageHeader
        title="Admin dashboard"
        description="Platform overview and management."
        actions={
          <Link href="/admin/users" className="btn-primary">
            <Icon name="users" className="h-4 w-4" />
            Manage users
          </Link>
        }
      />

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total users"
          value={stats.totalUsers}
          icon="users"
          tone="primary"
          hint={`${stats.totalDoctors} doctors · ${stats.totalPatients} patients`}
        />
        <StatCard
          label="Consultations"
          value={stats.totalConsultations}
          icon="message"
          tone="accent"
          hint={`${stats.activeConsultations} active · ${stats.completedConsultations} completed`}
        />
        <StatCard
          label="AI token usage"
          value={formatTokens(stats.totalTokens)}
          icon="sparkles"
          tone="gray"
          hint={`In ${formatTokens(stats.totalInputTokens)} · Out ${formatTokens(stats.totalOutputTokens)}`}
        />
        <StatCard
          label="Blocked users"
          value={stats.blockedUsers}
          icon="lock"
          tone="red"
          hint={
            stats.blockedUsers === 0
              ? "No blocked users"
              : "Users blocked from access"
          }
        />
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
