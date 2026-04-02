"use client";

import { useEffect, useState } from "react";
import { Nav } from "../../../components/Nav";
import { RequireAuth } from "../../../components/RequireAuth";
import { createRecord, deleteRecord, listRecords, updateRecord } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { validateCreateRecordInput, validateUpdateRecordInput } from "../../../lib/validation";

export default function AdminRecordsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof listRecords>> | null>(null);
  const [amount, setAmount] = useState("100");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [category, setCategory] = useState("General");
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [editCategory, setEditCategory] = useState("");
  const [editOccurredAt, setEditOccurredAt] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!token) return;
    const r = await listRecords(token, { page: 1, pageSize: 50 });
    setData(r);
  }

  useEffect(() => {
    refresh().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <RequireAuth roles={["ADMIN"]}>
      <Nav />
      <div className="mx-auto w-full max-w-6xl px-6 py-6 text-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Records management</h1>
        <p className="mt-1 text-sm text-zinc-700">Admins can create/edit/delete financial records.</p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-medium text-zinc-900">Create record</div>
            <form
              className="mt-4 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!token) return;
                setError(null);
                const validated = validateCreateRecordInput({ amount, type, category, occurredAt, notes });
                if (!validated.success) {
                  setError(validated.message);
                  return;
                }
                try {
                  await createRecord(token, validated.data);
                  setAmount("100");
                  setType("INCOME");
                  setCategory("General");
                  setOccurredAt(new Date().toISOString().slice(0, 10));
                  setNotes("");
                  await refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Create failed");
                }
              }}
            >
              <div className="flex gap-3">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="amount"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-600 outline-none focus:border-zinc-400"
                />
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                >
                  <option value="INCOME">INCOME</option>
                  <option value="EXPENSE">EXPENSE</option>
                </select>
              </div>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="category"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-600 outline-none focus:border-zinc-400"
              />
              <input
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                type="date"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              />
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="notes (optional)"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-600 outline-none focus:border-zinc-400"
              />
              <button className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800">
                Create
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-medium text-zinc-900">Records</div>
            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200">
              <table className="w-full text-sm text-zinc-900">
                <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-700">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white text-zinc-900">
                  {(data?.records ?? []).map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2">{new Date(r.occurredAt).toLocaleDateString()}</td>
                      <td className="px-3 py-2">
                        {editingRecordId === r.id ? (
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value as "INCOME" | "EXPENSE")}
                            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 outline-none focus:border-zinc-400"
                          >
                            <option value="INCOME">INCOME</option>
                            <option value="EXPENSE">EXPENSE</option>
                          </select>
                        ) : (
                          r.type
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editingRecordId === r.id ? (
                          <input
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 outline-none focus:border-zinc-400"
                          />
                        ) : (
                          r.category
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {editingRecordId === r.id ? (
                          <input
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-28 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 outline-none focus:border-zinc-400"
                          />
                        ) : (
                          r.amount
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {editingRecordId === r.id ? (
                          <div className="inline-flex gap-2">
                            <input
                              type="date"
                              value={editOccurredAt}
                              onChange={(e) => setEditOccurredAt(e.target.value)}
                              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 outline-none focus:border-zinc-400"
                            />
                            <input
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="notes"
                              className="w-32 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
                            />
                            <button
                              className="rounded-lg bg-zinc-900 px-2 py-1 text-xs text-white hover:bg-zinc-800"
                              onClick={async () => {
                                if (!token) return;
                                setError(null);
                                const validated = validateUpdateRecordInput({
                                  amount: editAmount,
                                  type: editType,
                                  category: editCategory,
                                  occurredAt: editOccurredAt,
                                  notes: editNotes,
                                });
                                if (!validated.success) {
                                  setError(validated.message);
                                  return;
                                }
                                try {
                                  await updateRecord(token, r.id, validated.data);
                                  setEditingRecordId(null);
                                  await refresh();
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : "Update failed");
                                }
                              }}
                            >
                              Save
                            </button>
                            <button
                              className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                              onClick={() => setEditingRecordId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex gap-2">
                            <button
                              className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                              onClick={() => {
                                setEditingRecordId(r.id);
                                setEditAmount(String(r.amount));
                                setEditType(r.type);
                                setEditCategory(r.category);
                                setEditOccurredAt(new Date(r.occurredAt).toISOString().slice(0, 10));
                                setEditNotes(r.notes ?? "");
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                              onClick={async () => {
                                if (!token) return;
                                setError(null);
                                try {
                                  await deleteRecord(token, r.id);
                                  await refresh();
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : "Delete failed");
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!data?.records?.length ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-zinc-600">
                        No records.
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

