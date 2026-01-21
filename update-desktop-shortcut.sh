#!/bin/bash
# Script pour mettre à jour le raccourci desktop après compilation

DESKTOP_FILE="$HOME/Bureau/GestionMax-DevCenter.desktop"
PROJECT_DIR="$HOME/CascadeProjects/gestionmax-devcenter"

echo "🔍 Recherche de l'AppImage..."

# Chercher l'AppImage le plus récent
APPIMAGE=$(find "$PROJECT_DIR/src-tauri/target/release/bundle/appimage" -name "*.AppImage" -type f 2>/dev/null | head -1)

if [ -z "$APPIMAGE" ]; then
    echo "❌ AppImage introuvable. La compilation est peut-être encore en cours."
    echo "   Répertoire attendu: $PROJECT_DIR/src-tauri/target/release/bundle/appimage/"
    exit 1
fi

echo "✅ AppImage trouvé: $APPIMAGE"

# Rendre l'AppImage exécutable
chmod +x "$APPIMAGE"
echo "✅ Permissions exécutables ajoutées à l'AppImage"

# Vérifier que l'icône existe
ICON="$PROJECT_DIR/src-tauri/icons/128x128.png"
if [ ! -f "$ICON" ]; then
    echo "⚠️  Icône introuvable: $ICON"
    ICON=""
fi

# Mettre à jour le fichier .desktop
cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=GestionMax DevCenter
Comment=Console DevOps pour GestionMax - Gestion de projets Payload + Next.js avec tunnels MongoDB Coolify via gmdev (v2.0)
Exec=$APPIMAGE
Icon=${ICON:-}
Terminal=false
Categories=Development;
StartupNotify=true
EOF

# Rendre le fichier .desktop exécutable
chmod +x "$DESKTOP_FILE"
echo "✅ Raccourci desktop mis à jour: $DESKTOP_FILE"
echo ""
echo "📋 Nouveau chemin AppImage: $APPIMAGE"
if [ -n "$ICON" ]; then
    echo "📋 Icône: $ICON"
fi
echo ""
echo "🎉 Le raccourci devrait maintenant fonctionner !"


