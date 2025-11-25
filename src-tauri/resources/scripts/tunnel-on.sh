#!/bin/bash
# Script pour démarrer le tunnel SSH
# Ce script est embarqué dans le bundle Tauri

# Configuration via variables d'environnement
PROJECT_TUNNEL_HOST="${PROJECT_TUNNEL_HOST:-}"
PROJECT_TUNNEL_USER="${PROJECT_TUNNEL_USER:-}"
PROJECT_TUNNEL_PORT="${PROJECT_TUNNEL_PORT:-22}"
PROJECT_LOCAL_MONGO="${PROJECT_LOCAL_MONGO:-27017}"
PROJECT_REMOTE_MONGO="${PROJECT_REMOTE_MONGO:-27017}"

if [ -z "$PROJECT_TUNNEL_HOST" ] || [ -z "$PROJECT_TUNNEL_USER" ]; then
    echo "Erreur: Variables PROJECT_TUNNEL_HOST/PROJECT_TUNNEL_USER manquantes"
    exit 1
fi

echo "Démarrage du tunnel SSH ($PROJECT_LOCAL_MONGO -> $PROJECT_REMOTE_MONGO via $PROJECT_TUNNEL_HOST)..."

ssh -N -L "${PROJECT_LOCAL_MONGO}:127.0.0.1:${PROJECT_REMOTE_MONGO}" \
    "${PROJECT_TUNNEL_USER}@${PROJECT_TUNNEL_HOST}" \
    -p "$PROJECT_TUNNEL_PORT" &

PID=$!

sleep 1

if ps -p "$PID" > /dev/null 2>&1; then
    echo "Tunnel SSH démarré (PID $PID) sur le port ${PROJECT_LOCAL_MONGO}"
    exit 0
else
    echo "Erreur: Impossible de démarrer le tunnel SSH"
    exit 1
fi

