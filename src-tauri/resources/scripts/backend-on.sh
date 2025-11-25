#!/bin/bash
# Script pour démarrer le backend Payload
# Ce script est embarqué dans le bundle Tauri

# Configuration par défaut
BACKEND_PATH="${PROJECT_BACKEND_PATH:-$HOME/CascadeProjects}"
BACKEND_DIR="${PROJECT_BACKEND_DIR:-backend}"

# Determiner le dossier de travail
if [ -n "$1" ]; then
    WORK_DIR="$1"
else
    WORK_DIR=$(find "$BACKEND_PATH" -maxdepth 2 -type d -name "backend" -o -name "payload" | head -1)
fi

if [ -z "$WORK_DIR" ] || [ ! -d "$WORK_DIR" ]; then
    echo "Erreur: Dossier backend introuvable ($WORK_DIR)"
    exit 1
fi

cd "$WORK_DIR" || { echo "Erreur: impossible d'accéder à $WORK_DIR"; exit 1; }

if [ ! -f "package.json" ]; then
    echo "Erreur: package.json introuvable dans $WORK_DIR"
    exit 1
fi

echo "Démarrage du backend dans $WORK_DIR..."

if [ -n "${PROJECT_BACKEND_COMMAND:-}" ]; then
    echo "Commande personnalisée : $PROJECT_BACKEND_COMMAND"
    eval "$PROJECT_BACKEND_COMMAND" &
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

echo "Backend démarré"

