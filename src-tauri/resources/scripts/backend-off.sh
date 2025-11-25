#!/bin/bash
# Script pour arrêter le backend Payload
# Ce script est embarqué dans le bundle Tauri

# Tuer les processus Node.js liés au backend Payload
pkill -f "node.*payload" 2>/dev/null
pkill -f "pnpm.*dev.*backend" 2>/dev/null
pkill -f "npm.*dev.*backend" 2>/dev/null

# Attendre un peu
sleep 0.5

# Vérifier si des processus existent encore
if pgrep -f "node.*payload" > /dev/null || pgrep -f ".*dev.*backend" > /dev/null; then
    # Forcer l'arrêt
    pkill -9 -f "node.*payload" 2>/dev/null
    pkill -9 -f ".*dev.*backend" 2>/dev/null
fi

echo "Backend arrêté"

