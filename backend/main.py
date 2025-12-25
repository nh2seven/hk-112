"""
Hollow Knight 112% Tracker - FastAPI Backend

Architecture:
- Direct DuckDB connection (no ORM, raw SQL only)
- Item tracking with region/category stats
- Session management for gameplay sessions
- SQL console restricted to SELECT queries for safety
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import duckdb
from pathlib import Path

# Database path - can be overridden via environment variable for Docker
import os
DB_PATH = Path(os.getenv("DB_PATH", str(Path(__file__).parent.parent / "db" / "hk_checklist.db")))

app = FastAPI(
    title="Hollow Knight Tracker API",
    description="Backend for the 112% completion tracker",
    version="1.0.0"
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Database Helpers
# =============================================================================

def get_connection():
    """
    Get a DuckDB connection.
    DuckDB handles concurrent reads well, but writes need care.
    For a local single-user app, this is sufficient.
    """
    return duckdb.connect(str(DB_PATH))


def execute_query(sql: str, params: list = None):
    """
    Execute a query and return results as list of dicts.
    """
    con = get_connection()
    try:
        if params:
            result = con.execute(sql, params)
        else:
            result = con.execute(sql)
        
        # Get column names
        columns = [desc[0] for desc in result.description]
        rows = result.fetchall()
        
        # Convert to list of dicts
        return [dict(zip(columns, row)) for row in rows]
    finally:
        con.close()


def execute_write(sql: str, params: list = None):
    """
    Execute a write query (INSERT, UPDATE, DELETE).
    """
    con = get_connection()
    try:
        if params:
            con.execute(sql, params)
        else:
            con.execute(sql)
    finally:
        con.close()


# =============================================================================
# Pydantic Models
# =============================================================================

class ItemUpdate(BaseModel):
    """Model for updating an item's found status."""
    found: bool


class SQLQuery(BaseModel):
    """Model for SQL console queries."""
    query: str


class SQLResponse(BaseModel):
    """Response from SQL console."""
    columns: list[str]
    rows: list[list]
    row_count: int


class SessionCreate(BaseModel):
    """Model for creating a new session."""
    name: Optional[str] = None


class SessionItemAdd(BaseModel):
    """Model for adding an item to a session."""
    item_id: int


# =============================================================================
# API Endpoints
# =============================================================================

@app.get("/items")
def get_items(
    found: Optional[bool] = Query(None, description="Filter by found status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    region: Optional[str] = Query(None, description="Filter by region"),
    name: Optional[str] = Query(None, description="Filter by name (partial match)")
):
    """
    Get all items with optional filters.
    
    Filters are applied via WHERE clauses with parameterized queries
    to prevent SQL injection.
    """
    # Build query dynamically with parameterized values
    sql = "SELECT id, found, name, category, region, information, location_url FROM hk WHERE 1=1"
    params = []
    
    if found is not None:
        sql += " AND found = ?"
        params.append(found)
    
    if category:
        sql += " AND category = ?"
        params.append(category)
    
    if region:
        sql += " AND region = ?"
        params.append(region)
    
    if name:
        # Case-insensitive partial match
        sql += " AND LOWER(name) LIKE LOWER(?)"
        params.append(f"%{name}%")
    
    sql += " ORDER BY id"
    
    return execute_query(sql, params)


@app.get("/items/{item_id}")
def get_item(item_id: int):
    """Get a single item by ID."""
    result = execute_query(
        "SELECT id, found, name, category, region, information, location_url FROM hk WHERE id = ?",
        [item_id]
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return result[0]


@app.patch("/items/{item_id}")
def update_item(item_id: int, update: ItemUpdate):
    """
    Update an item's found status.
    
    Immediately persists to DuckDB.
    Returns the updated item.
    """
    # Verify item exists
    existing = execute_query("SELECT id FROM hk WHERE id = ?", [item_id])
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Update the found status
    execute_write(
        "UPDATE hk SET found = ? WHERE id = ?",
        [update.found, item_id]
    )
    
    # Return updated item
    return execute_query(
        "SELECT id, found, name, category, region, information, location_url FROM hk WHERE id = ?",
        [item_id]
    )[0]


@app.post("/sql", response_model=SQLResponse)
def execute_sql(query: SQLQuery):
    """
    Execute a read-only SQL query.
    
    SECURITY: Only SELECT statements are allowed.
    This is for the embedded SQL console feature.
    """
    sql = query.query.strip()
    
    # Validate query is SELECT only
    # Check first word after stripping whitespace
    first_word = sql.split()[0].upper() if sql.split() else ""
    
    if first_word != "SELECT":
        raise HTTPException(
            status_code=400,
            detail="Only SELECT queries are allowed. Write operations are not permitted through the SQL console."
        )
    
    # Additional safety: reject queries with dangerous keywords
    # This is defense-in-depth; the SELECT check should be sufficient
    dangerous_keywords = ["INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER", "TRUNCATE", "GRANT", "REVOKE"]
    sql_upper = sql.upper()
    for keyword in dangerous_keywords:
        # Check for keyword as a word boundary (not part of another word)
        if f" {keyword} " in f" {sql_upper} ":
            raise HTTPException(
                status_code=400,
                detail=f"Query contains forbidden keyword: {keyword}"
            )
    
    try:
        con = get_connection()
        result = con.execute(sql)
        
        columns = [desc[0] for desc in result.description]
        rows = result.fetchall()
        
        con.close()
        
        return SQLResponse(
            columns=columns,
            rows=[list(row) for row in rows],
            row_count=len(rows)
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query error: {str(e)}")


@app.get("/categories")
def get_categories():
    """Get all unique categories for filter dropdown."""
    result = execute_query("SELECT DISTINCT category FROM hk ORDER BY category")
    return [row["category"] for row in result]


@app.get("/regions")
def get_regions():
    """Get all unique regions for filter dropdown."""
    result = execute_query("SELECT DISTINCT region FROM hk ORDER BY region")
    return [row["region"] for row in result]


@app.get("/stats")
def get_stats():
    """Get completion statistics."""
    result = execute_query("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN found THEN 1 ELSE 0 END) as found_count,
            SUM(CASE WHEN NOT found THEN 1 ELSE 0 END) as not_found_count
        FROM hk
    """)
    
    stats = result[0]
    stats["completion_percent"] = round(
        (stats["found_count"] / stats["total"]) * 100, 2
    ) if stats["total"] > 0 else 0
    
    return stats


@app.get("/stats/regions")
def get_region_stats():
    """Get completion statistics grouped by region."""
    result = execute_query("""
        SELECT 
            region,
            COUNT(*) as total,
            SUM(CASE WHEN found THEN 1 ELSE 0 END) as found_count,
            SUM(CASE WHEN NOT found THEN 1 ELSE 0 END) as not_found_count
        FROM hk
        GROUP BY region
        ORDER BY region
    """)
    
    # Add completion percentage to each region
    for row in result:
        row["completion_percent"] = round(
            (row["found_count"] / row["total"]) * 100, 2
        ) if row["total"] > 0 else 0
    
    return result


@app.get("/stats/categories")
def get_category_stats():
    """Get completion statistics grouped by category."""
    result = execute_query("""
        SELECT 
            category,
            COUNT(*) as total,
            SUM(CASE WHEN found THEN 1 ELSE 0 END) as found_count,
            SUM(CASE WHEN NOT found THEN 1 ELSE 0 END) as not_found_count
        FROM hk
        GROUP BY category
        ORDER BY category
    """)
    
    # Add completion percentage to each category
    for row in result:
        row["completion_percent"] = round(
            (row["found_count"] / row["total"]) * 100, 2
        ) if row["total"] > 0 else 0
    
    return result


# =============================================================================
# Session Endpoints
# =============================================================================

def ensure_sessions_tables():
    """Create sessions tables if they don't exist."""
    con = get_connection()
    try:
        # Sessions table
        con.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY,
                name VARCHAR,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                saved_at TIMESTAMP
            )
        """)
        # Session items table (many-to-many relationship)
        con.execute("""
            CREATE TABLE IF NOT EXISTS session_items (
                id INTEGER PRIMARY KEY,
                session_id INTEGER NOT NULL,
                item_id INTEGER NOT NULL,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(session_id, item_id)
            )
        """)
        # Create sequence for sessions if not exists
        try:
            con.execute("CREATE SEQUENCE IF NOT EXISTS sessions_id_seq START 1")
        except:
            pass
        try:
            con.execute("CREATE SEQUENCE IF NOT EXISTS session_items_id_seq START 1")
        except:
            pass
    finally:
        con.close()


# Ensure tables exist on startup
@app.on_event("startup")
def startup_event():
    ensure_sessions_tables()


@app.get("/sessions")
def get_sessions():
    """Get all sessions (both active and saved)."""
    ensure_sessions_tables()
    result = execute_query("""
        SELECT 
            s.id,
            s.name,
            s.created_at,
            s.saved_at,
            COUNT(si.item_id) as item_count
        FROM sessions s
        LEFT JOIN session_items si ON s.id = si.session_id
        GROUP BY s.id, s.name, s.created_at, s.saved_at
        ORDER BY s.created_at DESC
    """)
    return result


@app.post("/sessions")
def create_session(session: SessionCreate):
    """Create a new session."""
    ensure_sessions_tables()
    con = get_connection()
    try:
        # Get next ID
        result = con.execute("SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM sessions").fetchone()
        next_id = result[0]
        
        name = session.name or f"Session {next_id}"
        created_at = datetime.now().isoformat()
        
        con.execute(
            "INSERT INTO sessions (id, name, created_at) VALUES (?, ?, ?)",
            [next_id, name, created_at]
        )
        
        return {"id": next_id, "name": name, "created_at": created_at, "saved_at": None, "item_count": 0}
    finally:
        con.close()


@app.get("/sessions/{session_id}")
def get_session(session_id: int):
    """Get a session with its items."""
    ensure_sessions_tables()
    # Get session info
    session_result = execute_query(
        "SELECT id, name, created_at, saved_at FROM sessions WHERE id = ?",
        [session_id]
    )
    
    if not session_result:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = session_result[0]
    
    # Get items in this session
    items = execute_query("""
        SELECT 
            h.id, h.found, h.name, h.category, h.region, h.information, h.location_url,
            si.added_at
        FROM session_items si
        JOIN hk h ON si.item_id = h.id
        WHERE si.session_id = ?
        ORDER BY si.added_at
    """, [session_id])
    
    session["items"] = items
    session["item_count"] = len(items)
    
    return session


@app.delete("/sessions/{session_id}")
def delete_session(session_id: int):
    """Delete a session and its items."""
    ensure_sessions_tables()
    # Verify session exists
    existing = execute_query("SELECT id FROM sessions WHERE id = ?", [session_id])
    if not existing:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Delete session items first
    execute_write("DELETE FROM session_items WHERE session_id = ?", [session_id])
    # Delete session
    execute_write("DELETE FROM sessions WHERE id = ?", [session_id])
    
    return {"message": "Session deleted", "id": session_id}


@app.post("/sessions/{session_id}/save")
def save_session(session_id: int):
    """Mark a session as saved (finalized)."""
    ensure_sessions_tables()
    # Verify session exists
    existing = execute_query("SELECT id FROM sessions WHERE id = ?", [session_id])
    if not existing:
        raise HTTPException(status_code=404, detail="Session not found")
    
    saved_at = datetime.now().isoformat()
    execute_write(
        "UPDATE sessions SET saved_at = ? WHERE id = ?",
        [saved_at, session_id]
    )
    
    return get_session(session_id)


@app.post("/sessions/{session_id}/items")
def add_session_item(session_id: int, item: SessionItemAdd):
    """Add an item to a session."""
    ensure_sessions_tables()
    # Verify session exists
    session = execute_query("SELECT id, saved_at FROM sessions WHERE id = ?", [session_id])
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if session is already saved
    if session[0]["saved_at"]:
        raise HTTPException(status_code=400, detail="Cannot modify a saved session")
    
    # Verify item exists
    item_exists = execute_query("SELECT id FROM hk WHERE id = ?", [item.item_id])
    if not item_exists:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check if item already in session
    existing = execute_query(
        "SELECT id FROM session_items WHERE session_id = ? AND item_id = ?",
        [session_id, item.item_id]
    )
    if existing:
        raise HTTPException(status_code=400, detail="Item already in session")
    
    con = get_connection()
    try:
        # Get next ID
        result = con.execute("SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM session_items").fetchone()
        next_id = result[0]
        
        con.execute(
            "INSERT INTO session_items (id, session_id, item_id, added_at) VALUES (?, ?, ?, ?)",
            [next_id, session_id, item.item_id, datetime.now().isoformat()]
        )
    finally:
        con.close()
    
    return get_session(session_id)


@app.delete("/sessions/{session_id}/items/{item_id}")
def remove_session_item(session_id: int, item_id: int):
    """Remove an item from a session."""
    ensure_sessions_tables()
    # Verify session exists
    session = execute_query("SELECT id, saved_at FROM sessions WHERE id = ?", [session_id])
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if session is already saved
    if session[0]["saved_at"]:
        raise HTTPException(status_code=400, detail="Cannot modify a saved session")
    
    # Verify item is in session
    existing = execute_query(
        "SELECT id FROM session_items WHERE session_id = ? AND item_id = ?",
        [session_id, item_id]
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Item not in session")
    
    execute_write(
        "DELETE FROM session_items WHERE session_id = ? AND item_id = ?",
        [session_id, item_id]
    )
    
    return get_session(session_id)


@app.post("/sessions/{session_id}/clear")
def clear_session(session_id: int):
    """Remove all items from a session."""
    ensure_sessions_tables()
    # Verify session exists
    session = execute_query("SELECT id, saved_at FROM sessions WHERE id = ?", [session_id])
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if session is already saved
    if session[0]["saved_at"]:
        raise HTTPException(status_code=400, detail="Cannot modify a saved session")
    
    execute_write("DELETE FROM session_items WHERE session_id = ?", [session_id])
    
    return get_session(session_id)


# =============================================================================
# Main
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
