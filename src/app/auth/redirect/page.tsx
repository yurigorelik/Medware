"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingScreen } from "@/components/ui/States";

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
    <div className="auth-shell">
      <LoadingScreen label="Signing you in" />
    </div>
  );
}
