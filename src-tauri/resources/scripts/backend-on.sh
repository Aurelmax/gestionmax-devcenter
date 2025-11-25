#!/bin/bash
# Script pour démarrer le backend Payload
# Mono-repo: /gestionmaxopps/backend

BACKEND_ROOT="${PROJECT_BACKEND_PATH:-/home/gestionmax-aur-lien/CascadeProjects/gestionmaxopps}"
BACKEND_DIR="${PROJECT_BACKEND_DIR:-backend}"

WORK_DIR="$BACKEND_ROOT/$BACKEND_DIR"

if [ ! -d "$WORK_DIR" ]; then
    echo "Erreur: Dossier backend introuvable ($WORK_DIR)"
    exit 1
fi

cd "$WORK_DIR" || exit 1

if [ ! -f "package.json" ]; then
    echo "Erreur: package.json introuvable dans $WORK_DIR"
    exit 1
fi

echo "Démarrage du backend Payload dans $WORK_DIR..."

if command -v pnpm >/dev/null 2>&1; then
    pnpm dev &
elif command -v npm >/dev/null 2>&1; then
    npm run dev &
else
    echo "Erreur: pnpm ou npm non trouvé"
    exit 1
fi

echo "Backend Payload démarré"


