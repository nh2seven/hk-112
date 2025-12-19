#!/bin/bash
#
# Hollow Knight Tracker - Database Restore Script
#
# Usage:
#   ./scripts/restore.sh backup_20231220_120000.db   # Restore specific backup
#   ./scripts/restore.sh --latest                    # Restore most recent backup
#
# WARNING: This will overwrite the current database!
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
VOLUME_NAME="hk-tracker-db"
DB_NAME="hk_checklist.db"

echo "🎮 Hollow Knight Tracker - Database Restore"
echo "============================================"

# Determine backup file to restore
if [ "$1" = "--latest" ]; then
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/*.db 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        echo "❌ Error: No backups found in $BACKUP_DIR"
        exit 1
    fi
    echo "📁 Using latest backup: $(basename "$BACKUP_FILE")"
elif [ -n "$1" ]; then
    if [ -f "$BACKUP_DIR/$1" ]; then
        BACKUP_FILE="$BACKUP_DIR/$1"
    elif [ -f "$1" ]; then
        BACKUP_FILE="$1"
    else
        echo "❌ Error: Backup file not found: $1"
        exit 1
    fi
else
    echo "Usage: $0 <backup_file.db> | --latest"
    echo ""
    echo "Available backups:"
    ls -lht "$BACKUP_DIR"/*.db 2>/dev/null || echo "  No backups found"
    exit 1
fi

echo ""
echo "⚠️  WARNING: This will overwrite the current database!"
read -p "   Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    exit 0
fi

# Check if running in Docker or local mode
if docker volume inspect "$VOLUME_NAME" &>/dev/null; then
    echo "📦 Docker mode detected"
    echo "   Restoring to volume: $VOLUME_NAME"
    
    # Stop the backend container first
    echo "   Stopping backend container..."
    docker stop hk-backend 2>/dev/null || true
    
    # Use a temporary container to copy the file to the volume
    docker run --rm \
        -v "$VOLUME_NAME":/data \
        -v "$(realpath "$BACKUP_FILE")":/backup.db:ro \
        alpine \
        cp /backup.db /data/$DB_NAME
    
    # Restart the backend
    echo "   Restarting backend container..."
    docker start hk-backend 2>/dev/null || echo "   (Backend not running)"
    
    echo "✅ Database restored from: $BACKUP_FILE"
else
    # Local mode
    LOCAL_DB="$PROJECT_DIR/db/$DB_NAME"
    
    echo "📁 Local mode detected"
    echo "   Restoring to: $LOCAL_DB"
    
    mkdir -p "$(dirname "$LOCAL_DB")"
    cp "$BACKUP_FILE" "$LOCAL_DB"
    
    echo "✅ Database restored from: $BACKUP_FILE"
fi

echo ""
echo "🎮 Restore complete!"
