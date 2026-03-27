"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthRedirectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.replace("/auth/signin");
      return;
    }

    const role = session.user?.role;
    if (role === "DOCTOR") {
      router.replace("/doctor/dashboard");
    } else if (role === "PATIENT") {
      router.replace("/patient/dashboard");
    } else if (role === "ADMIN") {
      router.replace("/admin/dashboard");
    } else if (role === "BOTH") {
      router.replace("/patient/dashboard");
    } else {
      router.replace("/");
    }
  }, [session, status, router]);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
