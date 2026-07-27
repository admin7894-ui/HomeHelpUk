# HomeHelpUK Admin Web Panel — Vercel Deployment & Production Setup

This directory contains the production-ready **HomeHelpUK Centralized Admin Service & Pricing Management System**.

---

## 1. Architecture Overview

The Admin Panel operates as a Single-Page Application (SPA) communicating with the Node.js/Express backend API and PostgreSQL database:

```
┌───────────────────────────────┐     HTTPS API Requests     ┌───────────────────────────────┐     SQL Queries     ┌───────────────────────────────┐
│     Vercel Admin Web Panel    │ ─────────────────────────> │   HomeHelpUK Express API      │ ──────────────────> │     PostgreSQL Database       │
│  https://<domain>/admin       │ <───────────────────────── │   https://<api-domain>/api    │ <────────────────── │  (Categories, Services, etc.) │
└───────────────────────────────┘       JSON Responses       └───────────────────────────────┘   Result Datasets   └───────────────────────────────┘
```

- **Single Source of Truth**: All core service pricing, category configurations, provider eligibility, additions, exclusions, and FAQs are managed strictly by Admin in PostgreSQL.
- **Client Framework**: Vanilla JS, HTML5, CSS3 with zero build tool dependencies.
- **Route Navigation**: Real HTML5 History API route navigation (`/admin`, `/admin/categories`, `/admin/services`, `/admin/providers`, `/admin/settings`).

---

## 2. Vercel Configuration & Deployment Steps

### Option A: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy Project**:
   Run from the project root (`HomeHelpUK`):
   ```bash
   vercel
   ```

3. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

### Option B: Deploy via GitHub Integration

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "feat: production Vercel configuration for HomeHelpUK Admin Panel"
   git push origin main
   ```
2. Import the repository in your **Vercel Dashboard** (`https://vercel.com/new`).
3. Select Framework Preset: **Other**.
4. Set Root Directory: `./` (Root directory).
5. Click **Deploy**.

---

## 3. Required Environment Variables

Set the following environment variables in your **Vercel Project Settings → Environment Variables**:

| Variable Name | Description | Example / Default Value |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@ep-cool-db.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | Secret key for Admin & API JWT signing | `homehelpuk_jwt_secret_production_7894` |
| `VITE_API_URL` | Optional custom API host (if API is hosted separately) | `https://api.homehelp.uk` |
| `ADMIN_PANEL_URL` | Production Admin Panel origin for CORS whitelist | `https://home-help-uk-gvf1.vercel.app` |
| `NODE_ENV` | Runtime environment mode | `production` |

> ⚠️ **Security Warning**: Database credentials (`DATABASE_URL`) and `JWT_SECRET` are kept strictly server-side inside `server/` process environment variables and are **never exposed to client-side code**.

---

## 4. Backend CORS Configuration

The Express backend ([`server/server.js`](file:///c:/Users/v2spl/Downloads/HomeHelpUK-POC/HomeHelpUK/server/server.js)) is pre-configured with a strict origin check:

```javascript
const allowedOrigins = [
  process.env.ADMIN_PANEL_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  'https://home-help-uk-gvf1.vercel.app',
  'http://localhost:4000',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('CORS policy violation: Origin not allowed'));
  },
  credentials: true
}));
```

---

## 5. Vercel Rewrites & SPA Routing (`vercel.json`)

To prevent 404 errors when refreshing nested SPA routes (e.g. `/admin/services`, `/admin/providers`), [`vercel.json`](file:///c:/Users/v2spl/Downloads/HomeHelpUK-POC/HomeHelpUK/vercel.json) handles static asset rewrites and API proxies:

```json
{
  "version": 2,
  "builds": [
    { "src": "server/server.js", "use": "@vercel/node" },
    { "src": "admin-panel/**", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/server/server.js" },
    { "src": "/admin/(.*)", "dest": "/admin-panel/index.html" },
    { "src": "/admin", "dest": "/admin-panel/index.html" },
    { "src": "/(.*)", "dest": "/server/server.js" }
  ]
}
```

---

## 6. Admin Authentication & Default Credentials

- **Admin Login Route**: `/api/admin/auth/login`
- **Default Admin Email**: `admin@homehelp.uk`
- **Default Password**: `admin7894`
- **Token Persistence**: JWT stored in `localStorage` under `adminToken` and validated on every API call via `Authorization: Bearer <token>`.

---

## 7. How to Deploy Future Updates

1. Make your changes locally and verify functionality:
   ```bash
   npm start # in server/
   ```
2. Commit and push your changes:
   ```bash
   git add .
   git commit -m "feat: update category and pricing logic"
   git push origin main
   ```
3. Vercel will automatically trigger a production build and deploy your update in ~30 seconds.
