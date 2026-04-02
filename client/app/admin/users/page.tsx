"use client";

import { useEffect, useState } from "react";
import { Nav } from "../../../components/Nav";
import { RequireAuth } from "../../../components/RequireAuth";
import { createUser, listUsers, updateUser, type UserRole, type UserStatus } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { validateCreateUserInput } from "../../../lib/validation";

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof listUsers>> | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("VIEWER");
  const [status, setStatus] = useState<UserStatus>("ACTIVE");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("VIEWER");
  const [editStatus, setEditStatus] = useState<UserStatus>("ACTIVE");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    listUsers(token, { page: 1, pageSize: 50 })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [token]);

  return (
    <RequireAuth roles={["ADMIN"]}>
      <Nav />
      <div className="mx-auto w-full max-w-6xl px-6 py-6 text-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-100">User management</h1>
        <p className="mt-1 text-sm text-gray-200">Admins can create users and control role/status.</p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-medium text-zinc-900">Create user</div>
            <form
              className="mt-4 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!token) return;
                setError(null);
                const validated = validateCreateUserInput({ email, password, role, status });
                if (!validated.success) {
                  setError(validated.message);
                  return;
                }
                try {
                  await createUser(token, validated.data);
                  setEmail("");
                  setPassword("");
                  const updated = await listUsers(token, { page: 1, pageSize: 50 });
                  setData(updated);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Create failed");
                }
              }}
            >
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-600 outline-none focus:border-zinc-400"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-600 outline-none focus:border-zinc-400"
              />
              <div className="flex gap-3">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                >
                  <option value="VIEWER">VIEWER</option>
                  <option value="ANALYST">ANALYST</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as UserStatus)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <button className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800">
                Create
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-medium text-zinc-900">Users</div>
            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200">
              <table className="w-full text-sm text-zinc-900">
                <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-700">
                  <tr>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white text-zinc-900">
                  {(data?.users ?? []).map((u) => (
                    <tr key={u.id}>
                      <td className="px-3 py-2">{u.email}</td>
                      <td className="px-3 py-2">
                        {editingUserId === u.id ? (
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as UserRole)}
                            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 outline-none focus:border-zinc-400"
                          >
                            <option value="VIEWER">VIEWER</option>
                            <option value="ANALYST">ANALYST</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        ) : (
                          u.role
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editingUserId === u.id ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 outline-none focus:border-zinc-400"
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="INACTIVE">INACTIVE</option>
                          </select>
                        ) : (
                          u.status
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {editingUserId === u.id ? (
                          <div className="inline-flex gap-2">
                            <button
                              className="rounded-lg bg-zinc-900 px-2 py-1 text-xs text-white hover:bg-zinc-800"
                              onClick={async () => {
                                if (!token) return;
                                setError(null);
                                try {
                                  await updateUser(token, u.id, { role: editRole, status: editStatus });
                                  setEditingUserId(null);
                                  const updated = await listUsers(token, { page: 1, pageSize: 50 });
                                  setData(updated);
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : "Update failed");
                                }
                              }}
                            >
                              Save
                            </button>
                            <button
                              className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                              onClick={() => setEditingUserId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                            onClick={() => {
                              setEditingUserId(u.id);
                              setEditRole(u.role);
                              setEditStatus(u.status);
                            }}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!data?.users?.length ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-zinc-600">
                        No users.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}

