#!/bin/bash
# Script pour arrêter le tunnel SSH
# Ce script est embarqué dans le bundle Tauri

PROJECT_TUNNEL_HOST="${PROJECT_TUNNEL_HOST:-}"
PROJECT_TUNNEL_USER="${PROJECT_TUNNEL_USER:-}"
PROJECT_TUNNEL_PORT="${PROJECT_TUNNEL_PORT:-22}"
PROJECT_LOCAL_MONGO="${PROJECT_LOCAL_MONGO:-27017}"
PROJECT_REMOTE_MONGO="${PROJECT_REMOTE_MONGO:-27017}"

echo "Arrêt du tunnel SSH (${PROJECT_LOCAL_MONGO}:${PROJECT_REMOTE_MONGO})..."

PATTERN="ssh.*-L.*${PROJECT_LOCAL_MONGO}:127.0.0.1:${PROJECT_REMOTE_MONGO}"

if pkill -f "$PATTERN"; then
    echo "Processus SSH tué."
else
    echo "Aucun tunnel spécifique trouvé, tentative d'arrêt global..."
    pkill -f "ssh.*-L" || true
fi

sleep 0.5

if pgrep -f "$PATTERN" > /dev/null; then
    echo "Erreur: Le tunnel SSH est toujours actif."
    exit 1
fi

echo "Tunnel SSH arrêté"

