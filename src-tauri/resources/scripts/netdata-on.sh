#!/bin/bash
# Script pour démarrer Netdata
# Ce script est embarqué dans le bundle Tauri

# Essayer de démarrer Netdata selon différentes méthodes

# 1. Vérifier si Netdata est déjà en cours d'exécution
if pgrep -x "netdata" > /dev/null; then
    echo "Netdata est déjà en cours d'exécution"
    exit 0
fi

# 2. Essayer avec systemctl (si Netdata est un service système)
# 2. Essayer de démarrer en personnalisant la commande si fournie
if [ -n "${PROJECT_NETDATA_COMMAND:-}" ]; then
    echo "Commande personnalisée Netdata : $PROJECT_NETDATA_COMMAND"
    eval "$PROJECT_NETDATA_COMMAND" &
    sleep 1
    if pgrep -x "netdata" > /dev/null; then
        echo "Netdata démarré (commande personnalisée)"
        exit 0
    fi
fi

# 3. Essayer avec systemctl (si Netdata est un service système)
if command -v systemctl &> /dev/null; then
    if systemctl is-active --quiet netdata 2>/dev/null; then
        echo "Netdata est déjà actif comme service système"
        exit 0
    fi
    
    # Essayer de démarrer avec systemctl
    if systemctl start netdata 2>/dev/null; then
        echo "Netdata démarré via systemctl"
        exit 0
    fi
fi

# 4. Essayer de lancer netdata directement
if command -v netdata &> /dev/null; then
    netdata &
    sleep 1
    if pgrep -x "netdata" > /dev/null; then
        echo "Netdata démarré"
        exit 0
    fi
fi

# 4. Si rien ne fonctionne
echo "Erreur: Impossible de démarrer Netdata. Vérifiez que Netdata est installé."
exit 1

