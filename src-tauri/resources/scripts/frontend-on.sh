#!/bin/bash
# Script pour démarrer le frontend Next.js
# Ce script est embarqué dans le bundle Tauri

# Configuration par défaut
FRONTEND_PATH="${PROJECT_FRONTEND_PATH:-$HOME/CascadeProjects}"

if [ -n "$1" ]; then
    WORK_DIR="$1"
else
    WORK_DIR=$(find "$FRONTEND_PATH" -maxdepth 2 -type d -name "frontend" -o -name "next" | head -1)
fi

if [ -z "$WORK_DIR" ] || [ ! -d "$WORK_DIR" ]; then
    echo "Erreur: Dossier frontend introuvable ($WORK_DIR)"
    exit 1
fi

cd "$WORK_DIR" || { echo "Erreur: impossible d'accéder à $WORK_DIR"; exit 1; }

if [ ! -f "package.json" ]; then
    echo "Erreur: package.json introuvable dans $WORK_DIR"
    exit 1
fi

echo "Démarrage du frontend dans $WORK_DIR..."

if [ -n "${PROJECT_FRONTEND_COMMAND:-}" ]; then
    echo "Commande personnalisée : $PROJECT_FRONTEND_COMMAND"
    eval "$PROJECT_FRONTEND_COMMAND" &
else
    if command -v pnpm &> /dev/null; then
        pnpm dev &
    elif command -v npm &> /dev/null; then
        npm run dev &
    elif command -v yarn &> /dev/null; then
        yarn dev &
    else
        echo "Erreur: Aucun gestionnaire de paquets trouvé (pnpm, npm, yarn)"
        exit 1
    fi
fi

echo "Frontend démarré"

