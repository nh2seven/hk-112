# Hollow Knight 112% Tracker

A local web application to track your Hollow Knight 112% completion progress.

## Project Structure

```
HK/
├── assets/                    # Game assets (icons)
├── db/
│   ├── HK 112% Checklist.md  # Source checklist
│   └── hk_checklist.db       # DuckDB database
├── backups/                   # Database backups
├── scripts/
│   ├── init_db.py            # Docker DB initialization
│   ├── load_checklist.py     # MD → DuckDB parser
│   ├── backup.sh             # Backup script
│   └── restore.sh            # Restore script
├── backend/
│   ├── Dockerfile            # Backend container
│   ├── main.py               # FastAPI server
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── Dockerfile            # Frontend container
│   ├── nginx.conf            # Nginx config
│   ├── public/               # Static assets
│   └── src/                  # React source
└── docker-compose.yml        # Container orchestration
```

## Quick Start with Docker (Recommended)

```bash
# Initialize the database (first time only)
docker compose run --rm db-init

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

Access the app at **http://localhost:11200**

## Database Backup & Restore

```bash
# Create a backup
./scripts/backup.sh

# Create a named backup
./scripts/backup.sh before_radiance

# Restore from backup
./scripts/restore.sh backup_20231220_120000.db

# Restore latest backup
./scripts/restore.sh --latest
```

Backups are stored in `./backups/` directory.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/items` | List items (with optional filters) |
| GET | `/items/{id}` | Get single item |
| PATCH | `/items/{id}` | Update item's found status |
| POST | `/sql` | Execute read-only SQL query |
| GET | `/categories` | List all categories |
| GET | `/regions` | List all regions |
| GET | `/stats` | Get completion statistics |

### Filter Parameters for `/items`

- `found=true|false` - Filter by found status
- `category=<string>` - Filter by category
- `region=<string>` - Filter by region
- `name=<string>` - Partial match on name

### Example Queries

```bash
# Get all unfound bosses
curl "http://localhost:8000/items?found=false&category=Boss"

# Toggle item #5 as found
curl -X PATCH "http://localhost:8000/items/5" \
  -H "Content-Type: application/json" \
  -d '{"found": true}'

# Run SQL query
curl -X POST "http://localhost:8000/sql" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT region, COUNT(*) FROM hk GROUP BY region"}'
```

## Features

- ✅ Filterable table (status, category, region, name search)
- ✅ Click checkbox to mark items found/not found
- ✅ Optimistic UI updates with rollback on error
- ✅ Progress bar showing completion percentage
- ✅ Embedded SQL console for custom queries
- ✅ Map links open in new tab
- ✅ Dark theme inspired by Hollow Knight
- ✅ Dockerized deployment
- ✅ Database backup/restore scripts

## Tech Stack

- **Backend**: Python, FastAPI, DuckDB
- **Frontend**: React, TypeScript, Vite, Nginx
- **Infrastructure**: Docker, Docker Compose
- **No ORM**: Raw SQL queries only

## Local Development (without Docker)

```bash
# Initialize database
conda run -n eda python load_checklist.py

# Start backend
cd backend && uvicorn main:app --reload --port 8000

# Start frontend (in another terminal)
cd frontend && npm install && npm run dev
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173
