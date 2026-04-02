# Finance Dashboard (Express + Next.js)

Role-based finance dashboard with transactions + analytics.

## Stack
- **Backend**: Express (TypeScript), Prisma, Postgres, JWT, Zod
- **Frontend**: Next.js (App Router), Tailwind

## Roles
- **Viewer**: can view records + a dashboard summary
- **Analyst**: viewer + analytics endpoints (category totals, trends) + filter/search UI
- **Admin**: full control: manage users + manage records

## Local setup

### 1) Backend (`server/`)
Create `server/.env` with:
- `DATABASE_URL=...`
- `JWT_SECRET=...`
- `PORT=4000`
- `CORS_ORIGIN=http://localhost:3000`

Install + migrate + seed:

```bash
cd server
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Seeded users (password is `password` by default; override with `SEED_PASSWORD`):
- `admin@example.com`
- `analyst@example.com`
- `viewer@example.com`

### 2) Frontend (`client/`)
Create `client/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Run:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:3000`.

## API overview (high level)
- **Auth**: `POST /auth/login`, `GET /auth/me`
- **Users (admin only)**: `POST /users`, `GET /users`, `GET /users/:id`, `PATCH /users/:id`, `PATCH /users/:id/password`
- **Records**: `GET /records`, `GET /records/:id` (viewer+), `POST/PATCH/DELETE /records...` (admin only)
- **Dashboard**: `GET /dashboard/summary` (viewer+), `GET /dashboard/categories`, `GET /dashboard/trends` (analyst/admin)

More details in:
- `server/README.md`

