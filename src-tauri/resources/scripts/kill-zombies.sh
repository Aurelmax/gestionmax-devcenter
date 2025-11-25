#!/bin/bash
# Script pour tuer les processus zombies
# Ce script est embarqué dans le bundle Tauri

echo "Recherche et arrêt des processus zombies..."

# Liste des processus à tuer (orphelins)
ZOMBIE_PATTERNS=(
    "node.*dev"
    "pnpm.*dev"
    "npm.*dev"
    "yarn.*dev"
    "ssh.*-L"
    "netdata"
)

KILLED_COUNT=0

for pattern in "${ZOMBIE_PATTERNS[@]}"; do
    # Trouver les PIDs correspondants
    PIDS=$(pgrep -f "$pattern" 2>/dev/null)
    
    if [ -n "$PIDS" ]; then
        for pid in $PIDS; do
            # Vérifier que le processus existe et n'est pas un processus système
            if ps -p "$pid" > /dev/null 2>&1; then
                # Tuer le processus
                kill -TERM "$pid" 2>/dev/null
                KILLED_COUNT=$((KILLED_COUNT + 1))
            fi
        done
    fi
done

# Attendre un peu pour que les processus se terminent proprement
sleep 1

# Forcer l'arrêt des processus qui n'ont pas répondu
for pattern in "${ZOMBIE_PATTERNS[@]}"; do
    PIDS=$(pgrep -f "$pattern" 2>/dev/null)
    
    if [ -n "$PIDS" ]; then
        for pid in $PIDS; do
            if ps -p "$pid" > /dev/null 2>&1; then
                kill -9 "$pid" 2>/dev/null
            fi
        done
    fi
done

echo "$KILLED_COUNT processus zombie(s) supprimé(s)"

