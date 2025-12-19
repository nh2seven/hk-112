"""
Hollow Knight 112% Tracker - FastAPI Backend

Architecture:
- Direct DuckDB connection (no ORM, raw SQL only)
- Three endpoints: GET /items, PATCH /items/{id}, POST /sql
- SQL console restricted to SELECT queries for safety
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
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


# =============================================================================
# Main
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
