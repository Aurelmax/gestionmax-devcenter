#!/bin/bash

# PROJECT_BACKEND_PATH is the full path to the backend directory
WORK_DIR="${PROJECT_BACKEND_PATH:-}"

if [ -z "$WORK_DIR" ]; then
    echo "Erreur: Variable PROJECT_BACKEND_PATH non définie"
    exit 1
fi

if [ ! -d "$WORK_DIR" ]; then
    echo "Erreur: dossier backend introuvable: $WORK_DIR"
    echo "Vérifiez que le chemin est correct dans la configuration du projet"
    exit 1
fi

cd "$WORK_DIR" || exit 1

if [ ! -f "package.json" ]; then
    echo "Erreur: package.json introuvable dans $WORK_DIR"
    exit 1
fi

# Vérifier si node_modules existe, sinon installer les dépendances
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules introuvable, installation des dépendances..."
    
    # Détecter le gestionnaire de paquets
    if command -v pnpm &> /dev/null && [ -f "pnpm-lock.yaml" ]; then
        INSTALL_CMD="pnpm install"
    elif command -v yarn &> /dev/null && [ -f "yarn.lock" ]; then
        INSTALL_CMD="yarn install"
    else
        INSTALL_CMD="npm install"
    fi
    
    echo "📦 Installation avec: $INSTALL_CMD"
    $INSTALL_CMD
    if [ $? -ne 0 ]; then
        echo "❌ Erreur lors de l'installation des dépendances"
        exit 1
    fi
    echo "✅ Dépendances installées"
fi

echo "🚀 Démarrage Payload dans $WORK_DIR..."

# Use npm run dev by default, but allow override via PROJECT_BACKEND_COMMAND
COMMAND="${PROJECT_BACKEND_COMMAND:-npm run dev}"

$COMMAND &
echo "Backend Payload démarré avec: $COMMAND"




