#!/bin/bash
# Script pour démarrer le frontend Next.js (mono-repo gestionmaxopps)

FRONTEND_ROOT="${PROJECT_FRONTEND_PATH:-/home/gestionmax-aur-lien/CascadeProjects/gestionmaxopps}"
FRONTEND_DIR="${PROJECT_FRONTEND_DIR:-frontend}"

WORK_DIR="$FRONTEND_ROOT/$FRONTEND_DIR"

if [ ! -d "$WORK_DIR" ]; then
    echo "Erreur: dossier frontend introuvable ($WORK_DIR)"
    exit 1
fi

cd "$WORK_DIR" || { echo "Erreur: impossible d'accéder à $WORK_DIR"; exit 1; }

if [ ! -f "package.json" ]; then
    echo "Erreur: package.json introuvable dans $WORK_DIR"
    exit 1
fi

echo "Démarrage du frontend Next.js dans $WORK_DIR..."

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

