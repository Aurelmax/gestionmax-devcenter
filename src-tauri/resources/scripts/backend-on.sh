#!/bin/bash

# PROJECT_BACKEND_PATH is the full path to the backend directory
WORK_DIR="${PROJECT_BACKEND_PATH:-/home/gestionmax-aur-lien/CascadeProjects/gestionmaxopps/backend}"

if [ ! -d "$WORK_DIR" ]; then
    echo "Erreur: dossier backend introuvable ($WORK_DIR)"
    exit 1
fi

cd "$WORK_DIR" || exit 1

if [ ! -f "package.json" ]; then
    echo "Erreur: package.json introuvable dans $WORK_DIR"
    exit 1
fi

echo "🚀 Démarrage Payload dans $WORK_DIR..."

# Use pnpm by default, but allow override via PROJECT_BACKEND_COMMAND
COMMAND="${PROJECT_BACKEND_COMMAND:-pnpm dev}"

$COMMAND &
echo "Backend Payload démarré avec: $COMMAND"




