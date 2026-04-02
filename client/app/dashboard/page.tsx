"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Nav } from "../../components/Nav";
import { RequireAuth } from "../../components/RequireAuth";
import { dashboardCategories, dashboardSummary, dashboardTrends, listRecords } from "../../lib/api";
import { useAuth } from "../../lib/auth";

function isoRangeFromInputs(fromYmd: string, toYmd: string) {
  const out: { from?: string; to?: string } = {};
  if (fromYmd.trim()) {
    out.from = new Date(`${fromYmd.trim()}T00:00:00.000Z`).toISOString();
  }
  if (toYmd.trim()) {
    out.to = new Date(`${toYmd.trim()}T23:59:59.999Z`).toISOString();
  }
  return out;
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof dashboardSummary>> | null>(null);
  const [records, setRecords] = useState<Awaited<ReturnType<typeof listRecords>> | null>(null);
  const [cats, setCats] = useState<Awaited<ReturnType<typeof dashboardCategories>> | null>(null);
  const [trends, setTrends] = useState<Awaited<ReturnType<typeof dashboardTrends>> | null>(null);

  const [analysisView, setAnalysisView] = useState<"graph" | "raw">("graph");
  const [trendGranularity, setTrendGranularity] = useState<"month" | "day">("month");
  const [trendMonths, setTrendMonths] = useState(6);
  const [trendDays, setTrendDays] = useState(30);

  const [analyticsFrom, setAnalyticsFrom] = useState("");
  const [analyticsTo, setAnalyticsTo] = useState("");
  const [analysisSearch, setAnalysisSearch] = useState("");

  const [recordSearch, setRecordSearch] = useState("");
  const [recordType, setRecordType] = useState<"" | "INCOME" | "EXPENSE">("");
  const [recordFrom, setRecordFrom] = useState("");
  const [recordTo, setRecordTo] = useState("");

  const [error, setError] = useState<string | null>(null);

  const deferredRecordSearch = useDeferredValue(recordSearch);
  const deferredAnalysisSearch = useDeferredValue(analysisSearch);

  const canAnalyze = user?.role === "ANALYST" || user?.role === "ADMIN";

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);

    const analyticsRange = isoRangeFromInputs(analyticsFrom, analyticsTo);
    const searchTrim = deferredAnalysisSearch.trim();

    const catParams = {
      ...analyticsRange,
      ...(searchTrim ? { search: searchTrim } : {}),
    };

    const trendParams: Parameters<typeof dashboardTrends>[1] = {
      granularity: trendGranularity,
      ...(searchTrim ? { search: searchTrim } : {}),
      ...analyticsRange,
    };
    if (!analyticsFrom.trim() && !analyticsTo.trim()) {
      if (trendGranularity === "month") {
        trendParams.months = trendMonths;
      } else {
        trendParams.days = trendDays;
      }
    }

    const listParams: Parameters<typeof listRecords>[1] = {
      page: 1,
      pageSize: 50,
      ...(deferredRecordSearch.trim() ? { search: deferredRecordSearch.trim() } : {}),
      ...(recordType ? { type: recordType } : {}),
      ...isoRangeFromInputs(recordFrom, recordTo),
    };

    const results = await Promise.all([
      dashboardSummary(token, analyticsRange),
      listRecords(token, listParams),
      ...(canAnalyze ? [dashboardCategories(token, catParams), dashboardTrends(token, trendParams)] : []),
    ]);

    setSummary(results[0] as Awaited<ReturnType<typeof dashboardSummary>>);
    setRecords(results[1] as Awaited<ReturnType<typeof listRecords>>);
    if (canAnalyze) {
      setCats(results[2] as Awaited<ReturnType<typeof dashboardCategories>>);
      setTrends(results[3] as Awaited<ReturnType<typeof dashboardTrends>>);
    }
  }, [
    token,
    canAnalyze,
    analyticsFrom,
    analyticsTo,
    trendGranularity,
    trendMonths,
    trendDays,
    deferredRecordSearch,
    deferredAnalysisSearch,
    recordType,
    recordFrom,
    recordTo,
  ]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [load]);

  const categoryTotals = useMemo(() => {
    if (!cats) return [];
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of cats.totals) {
      const v = map.get(t.category) ?? { income: 0, expense: 0 };
      const n = Number(t.total);
      if (t.type === "INCOME") v.income += n;
      else v.expense += n;
      map.set(t.category, v);
    }
    return Array.from(map.entries()).map(([category, v]) => ({ category, ...v, net: v.income - v.expense }));
  }, [cats]);

  const periodTotals = useMemo(() => {
    if (!trends?.points?.length) return [];
    const map = new Map<string, { income: number; expense: number }>();
    for (const point of trends.points) {
      const key = typeof point.month === "string" ? point.month : String(point.month);
      const current = map.get(key) ?? { income: 0, expense: 0 };
      const total = Number(point.total);
      if (point.type === "INCOME") current.income += total;
      else current.expense += total;
      map.set(key, current);
    }
    return Array.from(map.entries()).map(([period, v]) => ({ period, ...v }));
  }, [trends]);

  const formatPeriodLabel = (periodKey: string) => {
    const d = new Date(periodKey);
    if (Number.isNaN(d.getTime())) return periodKey;
    if (trendGranularity === "day") {
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
    return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  };

  return (
    <RequireAuth>
      <Nav />
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-100">Dashboard</h1>
            <p className="mt-1 text-sm text-gray">
              {user?.role === "VIEWER"
                ? "Viewer: read-only access."
                : user?.role === "ANALYST"
                  ? "Analyst: records + analysis."
                  : "Admin: full access."}
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="text-sm text-zinc-600">Total income</div>
            <div className="mt-1 text-2xl font-semibold text-zinc-900">{summary?.totalIncome ?? "—"}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="text-sm text-zinc-600">Total expenses</div>
            <div className="mt-1 text-2xl font-semibold text-zinc-900">{summary?.totalExpense ?? "—"}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="text-sm text-zinc-600">Net balance</div>
            <div className="mt-1 text-2xl font-semibold text-zinc-900">{summary?.netBalance ?? "—"}</div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-medium text-zinc-900">Recent transactions</div>
                <div className="text-xs text-zinc-600">Search, filter by type and date range.</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                  placeholder="Search category, notes, amount…"
                  className="min-w-[12rem] flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                />
                <select
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value as "" | "INCOME" | "EXPENSE")}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                >
                  <option value="">All types</option>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="date"
                value={recordFrom}
                onChange={(e) => setRecordFrom(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              />
              <span className="self-center text-xs text-zinc-500">to</span>
              <input
                type="date"
                value={recordTo}
                onChange={(e) => setRecordTo(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              />
              <button
                type="button"
                className="rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
                onClick={() => {
                  setRecordSearch("");
                  setRecordType("");
                  setRecordFrom("");
                  setRecordTo("");
                }}
              >
                Clear filters
              </button>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-600">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {(records?.records ?? []).map((r) => (
                    <tr key={r.id} className="text-zinc-800">
                      <td className="px-3 py-2">{new Date(r.occurredAt).toLocaleDateString()}</td>
                      <td className="px-3 py-2">{r.type}</td>
                      <td className="px-3 py-2">{r.category}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.amount}</td>
                    </tr>
                  ))}
                  {!records?.records?.length ? (
                    <tr>
                      <td className="px-3 py-4 text-zinc-600" colSpan={4}>
                        No records match your filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-zinc-900">Analysis</div>
                {canAnalyze ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 text-xs">
                      <button
                        className={`rounded-md px-2 py-1 ${trendGranularity === "month" ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
                        onClick={() => setTrendGranularity("month")}
                      >
                        Monthly
                      </button>
                      <button
                        className={`rounded-md px-2 py-1 ${trendGranularity === "day" ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
                        onClick={() => setTrendGranularity("day")}
                      >
                        Daily
                      </button>
                    </div>
                    <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 text-xs">
                      <button
                        className={`rounded-md px-2 py-1 ${analysisView === "graph" ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
                        onClick={() => setAnalysisView("graph")}
                      >
                        Graph
                      </button>
                      <button
                        className={`rounded-md px-2 py-1 ${analysisView === "raw" ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
                        onClick={() => setAnalysisView("raw")}
                      >
                        Raw
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {canAnalyze ? (
                <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs">
                  <input
                    value={analysisSearch}
                    onChange={(e) => setAnalysisSearch(e.target.value)}
                    placeholder="Filter by category (contains)…"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-zinc-600">Range</span>
                    <input
                      type="date"
                      value={analyticsFrom}
                      onChange={(e) => setAnalyticsFrom(e.target.value)}
                      className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-zinc-900"
                    />
                    <span className="text-zinc-500">to</span>
                    <input
                      type="date"
                      value={analyticsTo}
                      onChange={(e) => setAnalyticsTo(e.target.value)}
                      className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-zinc-900"
                    />
                    {!analyticsFrom.trim() && !analyticsTo.trim() ? (
                      trendGranularity === "month" ? (
                        <label className="inline-flex items-center gap-1 text-zinc-700">
                          Last
                          <input
                            type="number"
                            min={1}
                            max={36}
                            value={trendMonths}
                            onChange={(e) => setTrendMonths(Math.min(36, Math.max(1, Number(e.target.value) || 1)))}
                            className="w-14 rounded border border-zinc-200 bg-white px-1 py-0.5 text-zinc-900"
                          />
                          mo
                        </label>
                      ) : (
                        <label className="inline-flex items-center gap-1 text-zinc-700">
                          Last
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={trendDays}
                            onChange={(e) => setTrendDays(Math.min(365, Math.max(1, Number(e.target.value) || 1)))}
                            className="w-16 rounded border border-zinc-200 bg-white px-1 py-0.5 text-zinc-900"
                          />
                          days
                        </label>
                      )
                    ) : null}
                    <button
                      type="button"
                      className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-zinc-700 hover:bg-zinc-100"
                      onClick={() => {
                        setAnalyticsFrom("");
                        setAnalyticsTo("");
                        setAnalysisSearch("");
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {!canAnalyze ? (
              <div className="mt-2 text-sm text-zinc-600">Viewer accounts can’t access analytics.</div>
            ) : (
              <>
                {analysisView === "graph" ? (
                  <>
                    <div className="mt-3 text-xs uppercase tracking-wide text-zinc-500">Category net (bars)</div>
                    <div className="mt-2 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                      {categoryTotals.map((c) => {
                        const max = Math.max(...categoryTotals.map((x) => Math.max(Math.abs(x.net), 1)));
                        const width = `${Math.min(100, (Math.abs(c.net) / max) * 100)}%`;
                        return (
                          <div key={c.category}>
                            <div className="mb-1 flex items-center justify-between text-xs text-zinc-700">
                              <span>{c.category}</span>
                              <span className="tabular-nums">{c.net.toFixed(2)}</span>
                            </div>
                            <div className="h-2 w-full rounded bg-zinc-200">
                              <div
                                className={`h-2 rounded ${c.net >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                                style={{ width }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {!categoryTotals.length ? <div className="text-sm text-zinc-600">No data yet.</div> : null}
                    </div>

                    <div className="mt-5 text-xs uppercase tracking-wide text-zinc-500">
                      Trends ({trendGranularity === "month" ? "monthly" : "daily"})
                    </div>
                    <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white p-3">
                      <svg viewBox="0 0 520 200" className="h-48 w-full">
                        {(() => {
                          if (!periodTotals.length) return null;
                          const max = Math.max(...periodTotals.map((m) => Math.max(m.income, m.expense, 1)));
                          const step = periodTotals.length > 1 ? 480 / (periodTotals.length - 1) : 0;
                          const toY = (value: number) => 170 - (value / max) * 140;
                          const incomePath = periodTotals
                            .map((m, idx) => `${idx === 0 ? "M" : "L"} ${20 + idx * step} ${toY(m.income)}`)
                            .join(" ");
                          const expensePath = periodTotals
                            .map((m, idx) => `${idx === 0 ? "M" : "L"} ${20 + idx * step} ${toY(m.expense)}`)
                            .join(" ");
                          return (
                            <>
                              <line x1="20" y1="170" x2="500" y2="170" stroke="#d4d4d8" />
                              <path d={incomePath} fill="none" stroke="#10b981" strokeWidth="2.5" />
                              <path d={expensePath} fill="none" stroke="#f43f5e" strokeWidth="2.5" />
                              {periodTotals.map((m, idx) => (
                                <g key={m.period}>
                                  <circle cx={20 + idx * step} cy={toY(m.income)} r="3" fill="#10b981" />
                                  <circle cx={20 + idx * step} cy={toY(m.expense)} r="3" fill="#f43f5e" />
                                  <text x={20 + idx * step} y={190} textAnchor="middle" fontSize="9" fill="#52525b">
                                    {formatPeriodLabel(m.period)}
                                  </text>
                                </g>
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                      {!periodTotals.length ? <div className="text-sm text-zinc-600">No trend data yet.</div> : null}
                      <div className="mt-2 flex gap-4 text-xs text-zinc-600">
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                          Income
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
                          Expense
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-3 text-xs uppercase tracking-wide text-zinc-500">Category totals (raw)</div>
                    <pre className="mt-2 max-h-40 overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
                      {JSON.stringify(categoryTotals, null, 2)}
                    </pre>

                    <div className="mt-5 text-xs uppercase tracking-wide text-zinc-500">
                      Trends — {trends?.granularity ?? trendGranularity} (raw)
                    </div>
                    <pre className="mt-2 max-h-40 overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
                      {JSON.stringify(trends?.points ?? [], null, 2)}
                    </pre>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
