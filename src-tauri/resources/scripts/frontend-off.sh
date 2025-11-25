#!/bin/bash
# Script pour arrêter le frontend Next.js
# Ce script est embarqué dans le bundle Tauri

# Tuer les processus Node.js liés au frontend Next.js
pkill -f "node.*next" 2>/dev/null
pkill -f "pnpm.*dev.*frontend" 2>/dev/null
pkill -f "npm.*dev.*frontend" 2>/dev/null

# Attendre un peu
sleep 0.5

# Vérifier si des processus existent encore
if pgrep -f "node.*next" > /dev/null || pgrep -f ".*dev.*frontend" > /dev/null; then
    # Forcer l'arrêt
    pkill -9 -f "node.*next" 2>/dev/null
    pkill -9 -f ".*dev.*frontend" 2>/dev/null
fi

echo "Frontend arrêté"

