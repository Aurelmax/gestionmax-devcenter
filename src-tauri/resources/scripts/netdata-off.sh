#!/bin/bash
# Script pour arrêter Netdata
# Ce script est embarqué dans le bundle Tauri

# Variable pour suivre si quelque chose a été arrêté
STOPPED=false

# 1. Essayer avec systemctl (si Netdata est un service système)
if command -v systemctl &> /dev/null; then
    if systemctl is-active --quiet netdata 2>/dev/null; then
        if systemctl stop netdata 2>/dev/null; then
            echo "Netdata arrêté via systemctl"
            STOPPED=true
        fi
    fi
fi

# 2. Tuer les processus Netdata directement
if pgrep -x "netdata" > /dev/null; then
    pkill -x "netdata" 2>/dev/null
    STOPPED=true
    
    # Attendre un peu
    sleep 0.5
    
    # Vérifier si des processus existent encore
    if pgrep -x "netdata" > /dev/null; then
        # Forcer l'arrêt
        pkill -9 -x "netdata" 2>/dev/null
    fi
fi

# Si rien n'a été arrêté, c'est que Netdata n'était pas en cours d'exécution
if [ "$STOPPED" = false ]; then
    echo "Netdata n'était pas en cours d'exécution"
    # Retourner 0 (succès) car l'objectif (arrêter Netdata) est atteint
    exit 0
fi

echo "Netdata arrêté"
exit 0

