#!/bin/bash
# Script de test pour la détection automatique de projet dans gmdev

echo "🧪 Test de détection automatique de projet"
echo "=========================================="
echo ""

PROJECTS_CONFIG="$HOME/.gestionmax-devcenter/projects-v3.json"

if [ ! -f "$PROJECTS_CONFIG" ]; then
    echo "❌ Fichier de configuration introuvable: $PROJECTS_CONFIG"
    exit 1
fi

echo "📋 Projets configurés dans projects-v3.json:"
echo ""
jq -r '.projects[] | "  • \(.id) (\(.name))\n    rootPath: \(.rootPath // "null")\n    backendPath: \(.backendPath // "null")\n    frontendPath: \(.frontendPath // "null")\n"' "$PROJECTS_CONFIG"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test depuis différents répertoires
test_dirs=(
    "$HOME/CascadeProjects/gestionmax"
    "$HOME/CascadeProjects/gestionmax/gestionmaxbackpayload"
    "$HOME/CascadeProjects/gestionmax/gestionmaxfront"
    "$HOME/CascadeProjects/gestionmax/gestionmaxbackpayload/src"
)

for test_dir in "${test_dirs[@]}"; do
    if [ -d "$test_dir" ]; then
        echo "📍 Test depuis: $test_dir"
        cd "$test_dir" || continue
        
        # Simuler la détection de gmdev
        detected=$(jq -r --arg dir "$(pwd)" '
            .projects[] |
            select(
              (.rootPath     // "" | startswith($dir)) or
              (.backendPath  // "" | startswith($dir)) or
              (.frontendPath // "" | startswith($dir)) or
              ($dir | startswith(.rootPath // "")) or
              ($dir | startswith(.backendPath // "")) or
              ($dir | startswith(.frontendPath // ""))
            ) |
            .id
        ' "$PROJECTS_CONFIG" 2>/dev/null | head -1)
        
        if [ -n "$detected" ] && [ "$detected" != "null" ]; then
            project_name=$(jq -r --arg id "$detected" '.projects[] | select(.id == $id) | .name' "$PROJECTS_CONFIG")
            echo "   ✅ Projet détecté: $detected ($project_name)"
        else
            echo "   ⚠️  Aucun projet détecté (fallback: $(basename "$test_dir"))"
        fi
        echo ""
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Pour activer un projet depuis n'importe quel dossier:"
echo "   gmdev activate <project-id>"
echo ""
echo "💡 Pour activer le projet détecté automatiquement:"
echo "   cd /chemin/vers/projet && gmdev activate"
