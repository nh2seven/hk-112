#!/usr/bin/env python3
"""
Database initialization script for Docker.
Parses the markdown checklist and creates the DuckDB database.
"""

import sys
from pathlib import Path

# Add scripts directory to path for imports
sys.path.insert(0, '/app/scripts')

from load_checklist import parse_markdown_table, create_database

DB_PATH = Path('/data/hk_checklist.db')
CHECKLIST_PATH = Path('/app/db/HK 112% Checklist.md')

def main():
    if DB_PATH.exists():
        print(f'Database already exists at {DB_PATH}, skipping initialization')
        print('To reinitialize, delete the volume: docker volume rm hk-tracker-db')
        return
    
    print(f'Parsing checklist from: {CHECKLIST_PATH}')
    entries = parse_markdown_table(str(CHECKLIST_PATH))
    print(f'Found {len(entries)} entries')
    
    print(f'Creating database at: {DB_PATH}')
    create_database(str(DB_PATH), entries)
    print('Database initialized successfully!')

if __name__ == '__main__':
    main()
