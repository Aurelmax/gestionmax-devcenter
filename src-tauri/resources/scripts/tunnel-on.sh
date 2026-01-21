#!/bin/bash
# Script pour démarrer le tunnel SSH avec MongoDB
# Supporte plusieurs tunnels simultanés avec des ports locaux différents

PROJECT_TUNNEL_HOST="${PROJECT_TUNNEL_HOST:-}"
PROJECT_TUNNEL_USER="${PROJECT_TUNNEL_USER:-}"
PROJECT_TUNNEL_PORT="${PROJECT_TUNNEL_PORT:-22}"
PROJECT_TUNNEL_KEY="${PROJECT_TUNNEL_KEY:-$HOME/.ssh/id_ed25519_hetzner}"

LOCAL_MONGO="${PROJECT_LOCAL_MONGO:-27017}"
REMOTE_MONGO="${PROJECT_REMOTE_MONGO:-27017}"

if [ -z "$PROJECT_TUNNEL_HOST" ] || [ -z "$PROJECT_TUNNEL_USER" ]; then
    echo "Erreur: Variables PROJECT_TUNNEL_HOST/PROJECT_TUNNEL_USER manquantes"
    exit 1
fi

if [ ! -f "$PROJECT_TUNNEL_KEY" ]; then
    echo "Erreur: Clé SSH introuvable: $PROJECT_TUNNEL_KEY"
    exit 1
fi

echo "🔐 Tunnel SSH: localhost:$LOCAL_MONGO → $PROJECT_TUNNEL_HOST:$REMOTE_MONGO"

ssh \
    -i "$PROJECT_TUNNEL_KEY" \
    -p "$PROJECT_TUNNEL_PORT" \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
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

