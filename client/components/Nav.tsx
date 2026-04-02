"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm ${
        active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
      }`}
    >
      {label}
    </Link>
  );
}

export function Nav() {
  const { user, logout } = useAuth();
  return (
    <div className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-zinc-900">
          Finance Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <NavLink href="/dashboard" label="Dashboard" />
          {user?.role === "ADMIN" ? (
            <>
              <NavLink href="/admin/users" label="Users" />
              <NavLink href="/admin/records" label="Records" />
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="text-xs text-zinc-600">
                <div className="font-medium text-zinc-900">{user.email}</div>
                <div>{user.role}</div>
              </div>
              <button
                onClick={logout}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

