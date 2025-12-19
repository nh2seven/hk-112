#!/usr/bin/env python3
"""
Hollow Knight 112% Checklist Parser and DuckDB Loader

Parses the markdown checklist file and loads it into a DuckDB database.
"""

import re
import duckdb
from pathlib import Path


def parse_found(cell: str) -> bool:
    """Check if the item is marked as found (contains **X**)."""
    return "**X**" in cell or "**x**" in cell


def extract_url(cell: str) -> str | None:
    """Extract URL from markdown link format [](url) or [text](url)."""
    match = re.search(r'\[.*?\]\((https?://[^)]+)\)', cell)
    return match.group(1) if match else None


def clean_text(text: str) -> str:
    """Remove markdown formatting and clean up text."""
    # Remove markdown links, keep the text part or empty
    text = re.sub(r'\[([^\]]*)\]\([^)]+\)', r'\1', text)
    # Remove bold/italic markers
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    # Clean up extra whitespace
    text = ' '.join(text.split())
    return text.strip()


def parse_markdown_table(filepath: str) -> list[dict]:
    """Parse the markdown table and return a list of entries."""
    entries = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Skip empty lines and find the table
    in_table = False
    header_found = False
    
    for line in lines:
        line = line.strip()
        
        # Skip empty lines
        if not line:
            continue
        
        # Check if this is a table row (starts and ends with |)
        if line.startswith('|') and line.endswith('|'):
            # Skip the header separator row (contains :---)
            if ':---' in line or '---:' in line or '| ---' in line:
                header_found = True
                continue
            
            # Skip the actual header row (first row before separator)
            if not header_found:
                continue
            
            # Parse data row
            cells = line.split('|')
            # Remove empty first and last elements from split
            cells = [c.strip() for c in cells[1:-1]]
            
            if len(cells) >= 5:
                found = parse_found(cells[0])
                location_url = extract_url(cells[1])
                name = clean_text(cells[2])
                category = clean_text(cells[3])
                region = clean_text(cells[4])
                information = clean_text(cells[5]) if len(cells) > 5 else ""
                
                # Only add entries that have a name
                if name:
                    entries.append({
                        'found': found,
                        'location_url': location_url,
                        'name': name,
                        'category': category,
                        'region': region,
                        'information': information
                    })
    
    return entries


def create_database(db_path: str, entries: list[dict]) -> None:
    """Create DuckDB database and populate it with entries."""
    # Connect to database (creates if doesn't exist)
    con = duckdb.connect(db_path)
    
    # Drop table if exists for fresh start
    con.execute("DROP TABLE IF EXISTS hk")
    
    # Create the table with serial/id column
    con.execute("""
        CREATE TABLE hk (
            id INTEGER PRIMARY KEY,
            found BOOLEAN,
            name VARCHAR,
            category VARCHAR,
            region VARCHAR,
            information VARCHAR,
            location_url VARCHAR
        )
    """)
    
    # Insert all entries
    for i, entry in enumerate(entries, start=1):
        con.execute("""
            INSERT INTO hk (id, found, name, category, region, information, location_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, [
            i,
            entry['found'],
            entry['name'],
            entry['category'],
            entry['region'],
            entry['information'],
            entry['location_url']
        ])
    
    # Create indexes for common queries
    con.execute("CREATE INDEX idx_hk_region ON hk(region)")
    con.execute("CREATE INDEX idx_hk_category ON hk(category)")
    con.execute("CREATE INDEX idx_hk_found ON hk(found)")
    
    con.close()


def main():
    # Paths
    script_dir = Path(__file__).parent
    checklist_path = script_dir / "HK 112% Checklist.md"
    db_path = script_dir / "db" / "hk_checklist.db"
    
    # Ensure db directory exists
    db_path.parent.mkdir(exist_ok=True)
    
    print(f"Parsing checklist from: {checklist_path}")
    entries = parse_markdown_table(str(checklist_path))
    print(f"Found {len(entries)} entries")
    
    print(f"\nCreating database at: {db_path}")
    create_database(str(db_path), entries)
    print("Database created successfully!")
    
    # Show some sample queries
    con = duckdb.connect(str(db_path))
    
    print("\n" + "="*60)
    print("Sample Queries:")
    print("="*60)
    
    # Total entries
    result = con.execute("SELECT COUNT(*) as total FROM hk").fetchone()
    print(f"\nTotal entries: {result[0]}")
    
    # Found vs not found
    result = con.execute("""
        SELECT 
            SUM(CASE WHEN found THEN 1 ELSE 0 END) as found_count,
            SUM(CASE WHEN NOT found THEN 1 ELSE 0 END) as not_found_count
        FROM hk
    """).fetchone()
    print(f"Found: {result[0]}, Not found: {result[1]}")
    
    # Categories breakdown
    print("\nEntries by category:")
    result = con.execute("""
        SELECT category, COUNT(*) as count 
        FROM hk 
        GROUP BY category 
        ORDER BY count DESC
    """).fetchall()
    for row in result:
        print(f"  {row[0]}: {row[1]}")
    
    # Regions breakdown
    print("\nEntries by region:")
    result = con.execute("""
        SELECT region, COUNT(*) as count 
        FROM hk 
        GROUP BY region 
        ORDER BY count DESC
        LIMIT 10
    """).fetchall()
    for row in result:
        print(f"  {row[0]}: {row[1]}")
    
    # Example: Greenpath items that are found
    print("\n" + "="*60)
    print("Example: SELECT * FROM hk WHERE region='Greenpath' AND found=1")
    print("="*60)
    result = con.execute("""
        SELECT id, name, category, found 
        FROM hk 
        WHERE region='Greenpath' AND found=true
    """).fetchall()
    for row in result:
        print(f"  [{row[0]}] {row[1]} ({row[2]}) - Found: {row[3]}")
    
    con.close()
    
    print("\n" + "="*60)
    print("Database ready! You can now query it with:")
    print("  duckdb hollow_knight.db")
    print("\nExample queries:")
    print("  SELECT * FROM hk WHERE region='Greenpath' AND found=true;")
    print("  SELECT * FROM hk WHERE category='Boss' AND found=false;")
    print("  SELECT region, COUNT(*) FROM hk GROUP BY region;")
    print("="*60)


if __name__ == "__main__":
    main()
