#!/bin/bash
# Script pour démarrer le tunnel SSH avec Mongo sur 27017

PROJECT_TUNNEL_HOST="${PROJECT_TUNNEL_HOST:-}"
PROJECT_TUNNEL_USER="${PROJECT_TUNNEL_USER:-}"
PROJECT_TUNNEL_PORT="${PROJECT_TUNNEL_PORT:-22}"

LOCAL_MONGO="${PROJECT_LOCAL_MONGO:-27017}"
REMOTE_MONGO="${PROJECT_REMOTE_MONGO:-27017}"

if [ -z "$PROJECT_TUNNEL_HOST" ] || [ -z "$PROJECT_TUNNEL_USER" ]; then
    echo "Erreur: Variables PROJECT_TUNNEL_HOST/PROJECT_TUNNEL_USER manquantes"
    exit 1
fi

echo "🔐 Tunnel SSH: localhost:$LOCAL_MONGO → $PROJECT_TUNNEL_HOST:$REMOTE_MONGO"

ssh \
    -i "$HOME/.ssh/id_ed25519_hetzner" \
    -p "$PROJECT_TUNNEL_PORT" \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -N \
    -L "${LOCAL_MONGO}:127.0.0.1:${REMOTE_MONGO}" \
    "${PROJECT_TUNNEL_USER}@${PROJECT_TUNNEL_HOST}" &

PID=$!

sleep 1

if ps -p "$PID" >/dev/null 2>&1; then
    echo "✨ Tunnel SSH actif (PID: $PID)"
    exit 0
else
    echo "❌ Échec du tunnel SSH"
    exit 1
fi

