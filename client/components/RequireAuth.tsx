"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "../lib/api";
import { useAuth } from "../lib/auth";

export function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const router = useRouter();
  const { loading, user } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) return <div className="p-6 text-sm text-zinc-600">Loading…</div>;
  if (!user) return null;
  if (roles && !roles.includes(user.role)) {
    return <div className="p-6 text-sm text-zinc-600">You don’t have access to this page.</div>;
  }
  return <>{children}</>;
}

