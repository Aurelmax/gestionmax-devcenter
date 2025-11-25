#!/bin/bash

# PROJECT_FRONTEND_PATH is the full path to the frontend directory
WORK_DIR="${PROJECT_FRONTEND_PATH:-/home/gestionmax-aur-lien/CascadeProjects/gestionmaxopps/frontend}"

if [ ! -d "$WORK_DIR" ]; then
    echo "Erreur: dossier frontend introuvable ($WORK_DIR)"
    exit 1
fi

cd "$WORK_DIR" || exit 1

if [ ! -f "package.json" ]; then
    echo "Erreur: package.json introuvable dans $WORK_DIR"
    exit 1
fi

echo "🚀 Démarrage frontend Next.js dans $WORK_DIR..."

# Use npm by default, but allow override via PROJECT_FRONTEND_COMMAND
COMMAND="${PROJECT_FRONTEND_COMMAND:-npm run dev}"

$COMMAND &
echo "Frontend Next.js démarré avec: $COMMAND"


