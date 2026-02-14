# Sentinel Agency Management Platform

A complete insurance agency management system for Sentinel Insurance, LLC.

## Architecture

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Frontend | React + Vite + Tailwind CSS | Netlify |
| Backend | Python FastAPI | Railway or Render |
| Database | PostgreSQL | Supabase |
| File Storage | Microsoft OneDrive | Existing Microsoft 365 |

## Project Structure

```
sentinel-platform/
├── backend/          # FastAPI Python backend
│   ├── app/
│   │   ├── api/      # API route handlers
│   │   ├── models/   # SQLAlchemy database models
│   │   ├── schemas/  # Pydantic request/response schemas
│   │   ├── services/ # Business logic layer
│   │   ├── core/     # Config, auth, dependencies
│   │   └── db/       # Database connection and session
│   ├── migrations/   # Alembic database migrations
│   └── tests/
├── frontend/         # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/  # API client
│   │   └── context/   # React context providers
│   └── public/
└── schema.sql        # Full database schema (reference)
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL database (Supabase recommended)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Edit with your database URL and secrets
alembic upgrade head      # Run database migrations
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env      # Edit with your API URL
npm run dev
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql+asyncpg://user:password@host:port/dbname
SECRET_KEY=your-secret-key-here
MICROSOFT_CLIENT_ID=your-ms-client-id
MICROSOFT_CLIENT_SECRET=your-ms-client-secret
MICROSOFT_TENANT_ID=your-ms-tenant-id
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
```
