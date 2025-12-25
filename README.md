# Hollow Knight 112% Tracker

A local web application to track your Hollow Knight 112% completion progress.

## Features

- ✅ **Overview Dashboard** - See all completion metrics at a glance
  - Overall completion percentage with progress bar
  - Completion by region (clickable to filter)
  - Completion by category (clickable to filter)
  - Detailed summary tables
- ✅ **112% Checklist** - Filterable table of all items
  - Filter by status, category, region, or name search
  - Click checkbox to mark items found/not found
  - Optimistic UI updates with rollback on error
  - Map links open in new tab
- ✅ **Session Management** - Track items during gameplay
  - Create temporary item lists for gaming sessions
  - Add/remove items from your current session
  - Save sessions to history for later review
  - View and manage past sessions
- ✅ **SQL Console** - Execute custom queries
  - Read-only SQL queries on the database
  - Example query shortcuts
- ✅ Dark theme inspired by Hollow Knight
- ✅ Dockerized deployment
- ✅ Database backup/restore scripts

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
│       ├── components/       # Reusable components
│       └── pages/            # Page components
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

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Overview | `/` | Dashboard with all completion metrics |
| 112% Checklist | `/checklist` | Main item list with filters |
| Current Session | `/session` | Manage gameplay sessions |
| SQL Console | `/sql-console` | Execute read-only SQL queries |

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

### Items

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/items` | List items (with optional filters) |
| GET | `/items/{id}` | Get single item |
| PATCH | `/items/{id}` | Update item's found status |

### Filter Parameters for `/items`

- `found=true|false` - Filter by found status
- `category=<string>` - Filter by category
- `region=<string>` - Filter by region
- `name=<string>` - Partial match on name

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | Get overall completion statistics |
| GET | `/stats/regions` | Get completion stats by region |
| GET | `/stats/categories` | Get completion stats by category |
| GET | `/categories` | List all categories |
| GET | `/regions` | List all regions |

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sessions` | List all sessions |
| POST | `/sessions` | Create a new session |
| GET | `/sessions/{id}` | Get session with items |
| DELETE | `/sessions/{id}` | Delete a session |
| POST | `/sessions/{id}/save` | Save (finalize) a session |
| POST | `/sessions/{id}/items` | Add item to session |
| DELETE | `/sessions/{id}/items/{item_id}` | Remove item from session |
| POST | `/sessions/{id}/clear` | Clear all items from session |

### SQL Console

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sql` | Execute read-only SQL query |

### Example Queries

```bash
# Get all unfound bosses
curl "http://localhost:8000/items?found=false&category=Boss"

# Toggle item #5 as found
curl -X PATCH "http://localhost:8000/items/5" \
  -H "Content-Type: application/json" \
  -d '{"found": true}'

# Get region stats
curl "http://localhost:8000/stats/regions"

# Create a new session
curl -X POST "http://localhost:8000/sessions" \
  -H "Content-Type: application/json" \
  -d '{"name": "Greenpath Run"}'

# Add item to session
curl -X POST "http://localhost:8000/sessions/1/items" \
  -H "Content-Type: application/json" \
  -d '{"item_id": 42}'

# Run SQL query
curl -X POST "http://localhost:8000/sql" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT region, COUNT(*) FROM hk GROUP BY region"}'
```

## Tech Stack

- **Backend**: Python, FastAPI, DuckDB
- **Frontend**: React, TypeScript, React Router, Vite, Nginx
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
