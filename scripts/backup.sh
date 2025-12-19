#!/bin/bash
#
# Hollow Knight Tracker - Database Backup Script
#
# Usage:
#   ./scripts/backup.sh              # Create timestamped backup
#   ./scripts/backup.sh my_backup    # Create named backup
#
# Backups are stored in ./backups/ directory
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
VOLUME_NAME="hk-tracker-db"
DB_NAME="hk_checklist.db"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename
if [ -n "$1" ]; then
    BACKUP_NAME="$1"
else
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
fi

BACKUP_FILE="$BACKUP_DIR/${BACKUP_NAME}.db"

echo "🎮 Hollow Knight Tracker - Database Backup"
echo "==========================================="

# Check if running in Docker or local mode
if docker volume inspect "$VOLUME_NAME" &>/dev/null; then
    echo "📦 Docker mode detected"
    echo "   Copying from volume: $VOLUME_NAME"
    
    # Use a temporary container to copy the file from the volume
    docker run --rm \
        -v "$VOLUME_NAME":/data:ro \
        -v "$BACKUP_DIR":/backup \
        alpine \
        cp /data/$DB_NAME "/backup/${BACKUP_NAME}.db"
    
    echo "✅ Backup created: $BACKUP_FILE"
else
    # Local mode - copy from db directory
    LOCAL_DB="$PROJECT_DIR/db/$DB_NAME"
    
    if [ -f "$LOCAL_DB" ]; then
        echo "📁 Local mode detected"
        echo "   Copying from: $LOCAL_DB"
        cp "$LOCAL_DB" "$BACKUP_FILE"
        echo "✅ Backup created: $BACKUP_FILE"
    else
        echo "❌ Error: Database not found"
        echo "   Expected at: $LOCAL_DB"
        echo "   Or in Docker volume: $VOLUME_NAME"
        exit 1
    fi
fi

# Show backup info
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo ""
echo "📊 Backup Info:"
echo "   File: $BACKUP_FILE"
echo "   Size: $BACKUP_SIZE"
echo ""

# List recent backups
echo "📚 Recent backups:"
ls -lht "$BACKUP_DIR"/*.db 2>/dev/null | head -5 || echo "   No backups found"
