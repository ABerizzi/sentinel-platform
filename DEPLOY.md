# Sentinel Platform — Deployment Guide

## Architecture

```
[Netlify] ──HTTPS──▶ [Railway] ──asyncpg──▶ [Supabase PostgreSQL]
 React SPA            FastAPI                 40 tables, triggers
```

---

## Step 1: Supabase Database (10 min)

### 1a. Create Project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New Project** → name it `sentinel-platform`
3. Set a strong database password → **save this password somewhere safe**
4. Region: **US East (N. Virginia)** — closest to Fort Lauderdale
5. Wait for project to provision (~2 min)

### 1b. Run Schema
1. Go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Paste the entire contents of `schema.sql` (955 lines)
4. Click **Run** (or Ctrl+Enter)
5. You should see "Success. No rows returned." — that means all 40 tables, enums, indexes, and triggers were created

### 1c. Verify
Run this in SQL Editor to confirm:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
```
You should see ~30+ tables (users, accounts, policies, etc.)

### 1d. Get Connection String
1. Go to **Project Settings** → **Database**
2. Scroll to **Connection string** → select **URI**
3. Copy the connection string. It looks like:
   ```
   postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```
4. **IMPORTANT**: Change the protocol to `postgresql+asyncpg://` for our backend:
   ```
   postgresql+asyncpg://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```
5. Use the **Session mode** connection (port `5432`), NOT Transaction mode (port `6543`). asyncpg needs session mode for prepared statements.

---

## Step 2: GitHub Repository (5 min)

### 2a. Create Repo
1. Go to [github.com/new](https://github.com/new)
2. Name: `sentinel-platform` (private repo)
3. Don't initialize with README (we have one)

### 2b. Push Code
```bash
cd sentinel-platform
git init
git add -A
git commit -m "Build 1: Full AMS platform — 14 pages, 40 tables, API, auth"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sentinel-platform.git
git push -u origin main
```

---

## Step 3: Railway Backend (15 min)

### 3a. Create Project
1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. **New Project** → **Deploy from GitHub Repo**
3. Select `sentinel-platform`
4. Railway will detect the repo — click **Add Service**
5. **IMPORTANT**: Set the **Root Directory** to `backend` (click the service → Settings → Root Directory → type `backend`)

### 3b. Set Environment Variables
Go to the service → **Variables** tab → add these:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql+asyncpg://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres` |
| `SECRET_KEY` | *(generate below)* |
| `CORS_ORIGINS` | `["https://YOUR-APP.netlify.app"]` |
| `DEBUG` | `false` |
| `AGENCY_NAME` | `Sentinel Insurance, LLC` |

**Generate your SECRET_KEY** — run this in any terminal or Python console:
```python
python3 -c "import secrets; print(secrets.token_hex(32))"
```
This gives you a 64-character hex string. Paste that as SECRET_KEY.

### 3c. Deploy
Railway auto-deploys when you push. Monitor the **Deploy Logs** tab. You should see:
```
🛡️  Sentinel Agency Platform v1.1.0 starting...
INFO:     Uvicorn running on http://0.0.0.0:PORT
```

### 3d. Get Your Backend URL
1. Go to **Settings** → **Networking** → **Generate Domain** (or add a custom domain)
2. Your URL will look like: `https://sentinel-platform-production.up.railway.app`

### 3e. Test the Health Endpoint
```bash
curl https://YOUR-BACKEND-URL.up.railway.app/api/health
```
Expected: `{"status":"ok","version":"1.1.0"}`

---

## Step 4: Netlify Frontend (5 min)

### 4a. Create Site
1. Go to [app.netlify.com](https://app.netlify.com)
2. **Add new site** → **Import an existing project** → **GitHub**
3. Select `sentinel-platform`
4. Configure:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`

### 4b. Set Environment Variables
Go to **Site configuration** → **Environment variables** → add:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://YOUR-BACKEND-URL.up.railway.app` |

**No trailing slash** on the URL.

### 4c. Deploy
Netlify auto-builds. Takes ~30-60 seconds. Once done you'll have a URL like `https://amazing-name-123.netlify.app`.

### 4d. Update Railway CORS
Go back to Railway → your backend service → Variables → update `CORS_ORIGINS`:
```
["https://YOUR-APP.netlify.app"]
```
Railway will auto-redeploy with the new CORS setting.

---

## Step 5: Create Your Admin Account (2 min)

### Option A: Use curl
```bash
curl -X POST https://YOUR-BACKEND-URL.up.railway.app/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alec@sentinelinsurancellc.com",
    "name": "Alec",
    "password": "YOUR-STRONG-PASSWORD-HERE",
    "role": "Admin"
  }'
```

### Option B: Use the Login Page
Navigate to your Netlify URL. The login page will show. Since no users exist yet, the app will show the setup flow (if implemented in the UI) — or you can use curl above and then log in normally.

**Password requirements**: Minimum 12 characters.

### Verify Login
After setup, go to your Netlify URL and log in with your credentials. You should see the Dashboard.

---

## Troubleshooting

### "Network Error" on frontend
- Check `VITE_API_URL` is set correctly in Netlify (no trailing slash)
- Check `CORS_ORIGINS` in Railway includes your Netlify URL
- Redeploy frontend after changing env vars (Netlify → Deploys → Trigger deploy)

### "500 Internal Server Error" on backend
- Check Railway deploy logs for Python traceback
- Most likely: `DATABASE_URL` format wrong (must start with `postgresql+asyncpg://`)
- Check Supabase is using Session mode port (5432), not Transaction mode (6543)

### "relation does not exist" errors
- Schema wasn't run. Go to Supabase SQL Editor and run `schema.sql` again
- Verify with: `SELECT table_name FROM information_schema.tables WHERE table_schema='public';`

### CORS errors in browser console
- `CORS_ORIGINS` must be valid JSON array: `["https://your-app.netlify.app"]`
- Include the full URL with `https://`
- Railway needs to redeploy after changing env vars

### Login returns 401
- Run the `/api/auth/setup` endpoint first (only works once, creates first admin)
- Check password is ≥12 characters

---

## Post-Deployment Checklist

- [ ] `schema.sql` run in Supabase — tables created
- [ ] Backend on Railway — `/api/health` returns `{"status":"ok"}`
- [ ] Frontend on Netlify — login page loads
- [ ] CORS configured — frontend can reach backend
- [ ] Admin account created via `/api/auth/setup`
- [ ] Can log in and see Dashboard
- [ ] Can create an Account
- [ ] Can create a Prospect
- [ ] Can create a Service Item
- [ ] Can log a Sale

---

## Custom Domain (Optional)

### Netlify
Site configuration → Domain management → Add custom domain → `app.sentinelinsurancellc.com`

### Railway
Service → Settings → Networking → Custom Domain → `api.sentinelinsurancellc.com`

Update `VITE_API_URL` in Netlify and `CORS_ORIGINS` in Railway to match the custom domains.
