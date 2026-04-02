# Finance API (Express + Prisma)

Base URL: `http://localhost:4000`

## Auth

### POST `/auth/login`

Body:
```json
{ "email": "admin@example.com", "password": "password" }
```

Response:
```json
{ "accessToken": "...", "user": { "id": "...", "email": "...", "role": "ADMIN", "status": "ACTIVE" } }
```

### GET `/auth/me`
Header: `Authorization: Bearer <token>`

## RBAC rules (server-enforced)
- **Viewer**: `GET /records`, `GET /records/:id`, `GET /dashboard/summary`
- **Analyst**: viewer + `GET /dashboard/categories`, `GET /dashboard/trends`
- **Admin**: everything + user/record management

Inactive users (`status=INACTIVE`) are blocked at the auth middleware level.

## Records

### GET `/records`
Header: `Authorization: Bearer <token>`

Query params:
- `page` (default 1), `pageSize` (default 20, max 100)
- `from`, `to` (date strings)
- `type` (`INCOME|EXPENSE`)
- `category` (exact match, case-insensitive)
- `minAmount`, `maxAmount`
- `search` (matches category/notes)
- `sort` one of: `occurredAt:desc` (default), `occurredAt:asc`, `amount:desc`, `amount:asc`

### POST `/records` (admin only)
Body:
```json
{ "amount": 1200.5, "type": "INCOME", "category": "Salary", "occurredAt": "2026-04-01T00:00:00.000Z", "notes": "optional" }
```

### PATCH `/records/:id` (admin only)
Partial body supported.

### DELETE `/records/:id` (admin only)
Soft delete (sets `deletedAt`).

## Dashboard / analytics

### GET `/dashboard/summary`
Returns totals + last 10 activities.

### GET `/dashboard/categories` (analyst/admin)
Returns category totals grouped by `category` + `type`.

### GET `/dashboard/trends` (analyst/admin)
Query: `months` (default 6, max 36)\nReturns month buckets using Postgres `date_trunc('month', occurredAt)`.

## Environment variables
- `DATABASE_URL` (required)
`JWT_SECRET` (required)
`PORT` (default 4000)
`CORS_ORIGIN` (default `http://localhost:3000`)
`SEED_PASSWORD` (optional; default `password`)
