export type UserRole = "VIEWER" | "ANALYST" | "ADMIN";
export type UserStatus = "ACTIVE" | "INACTIVE";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};

export type FinancialRecord = {
  id: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  occurredAt: string;
  notes: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

async function request<T>(
  path: string,
  opts: { method?: string; token?: string; body?: unknown; query?: Record<string, string | number | undefined> } = {},
): Promise<T> {
  const url = new URL(path, apiBaseUrl());
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: {
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const payload = (await res.json()) as { error?: { message?: string } };
      if (payload?.error?.message) {
        message = payload.error.message;
      }
    } catch {
      const text = await res.text();
      if (text) message = text;
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export async function login(email: string, password: string) {
  return request<{ accessToken: string; user: AuthUser }>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function me(token: string) {
  return request<{ user: AuthUser }>("/auth/me", { token });
}

export async function listRecords(
  token: string,
  params: {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: string;
    category?: string;
    from?: string;
    to?: string;
  } = {},
) {
  return request<{ page: number; pageSize: number; total: number; records: FinancialRecord[] }>("/records", {
    token,
    query: params,
  });
}

export async function createRecord(token: string, body: { amount: number; type: "INCOME" | "EXPENSE"; category: string; occurredAt: string; notes?: string }) {
  return request<{ record: FinancialRecord }>("/records", { token, method: "POST", body });
}

export async function updateRecord(
  token: string,
  id: string,
  body: Partial<{ amount: number; type: "INCOME" | "EXPENSE"; category: string; occurredAt: string; notes?: string }>,
) {
  return request<{ record: FinancialRecord }>(`/records/${id}`, { token, method: "PATCH", body });
}

export async function deleteRecord(token: string, id: string) {
  await request<unknown>(`/records/${id}`, { token, method: "DELETE" });
}

export async function dashboardSummary(
  token: string,
  params: { from?: string; to?: string } = {},
) {
  return request<{ totalIncome: string; totalExpense: string; netBalance: string; recentActivity: FinancialRecord[] }>(
    "/dashboard/summary",
    { token, query: params },
  );
}

export async function dashboardCategories(
  token: string,
  params: { from?: string; to?: string; search?: string } = {},
) {
  return request<{ totals: Array<{ category: string; type: "INCOME" | "EXPENSE"; total: string }> }>("/dashboard/categories", {
    token,
    query: params,
  });
}

export async function dashboardTrends(
  token: string,
  params: {
    months?: number;
    days?: number;
    granularity?: "month" | "day";
    from?: string;
    to?: string;
    search?: string;
  } = {},
) {
  return request<{
    from: string;
    to: string;
    granularity?: "month" | "day";
    points: Array<{ month: string; type: "INCOME" | "EXPENSE"; total: string }>;
  }>("/dashboard/trends", {
    token,
    query: params,
  });
}

export async function listUsers(token: string, params: { page?: number; pageSize?: number; search?: string } = {}) {
  return request<{ page: number; pageSize: number; total: number; users: Array<{ id: string; email: string; role: UserRole; status: UserStatus }> }>(
    "/users",
    { token, query: params },
  );
}

export async function createUser(token: string, body: { email: string; password: string; role: UserRole; status: UserStatus }) {
  return request<{ user: { id: string; email: string; role: UserRole; status: UserStatus } }>("/users", { token, method: "POST", body });
}

export async function updateUser(token: string, id: string, body: Partial<{ role: UserRole; status: UserStatus }>) {
  return request<{ user: { id: string; email: string; role: UserRole; status: UserStatus } }>(`/users/${id}`, {
    token,
    method: "PATCH",
    body,
  });
}

